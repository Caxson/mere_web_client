<template>
    <div class="video-wrapper">
        <div class="video-container">
            <div class="video-label">Local</div>
            <img src="../assets/mere_d.webp" class="video-placeholder" />
            <video ref="localVideo" autoplay playsinline></video>
        </div>
        <div class="video-container">
            <div class="video-label">Remote</div>
            <img src="../assets/mere_d.webp" class="video-placeholder" />
            <video ref="remoteVideo" autoplay playsinline></video>
        </div>
        <div class="button-container">
            <button @click="startSession" :disabled="uiState !== UI_IDLE" class="start">CALL</button>
            <button @click="stopSession" :disabled="uiState !== UI_STARTED" class="stop">STOP</button>
        </div>
        <div v-if="uiState === UI_IDLE">等待推流...</div>
        <div v-if="uiState === UI_STARTED">推流已开始！</div>
        <!-- 弹窗提示用户检查网络并重试 -->
        <div v-if="showRetryPrompt" class="retry_window">
            <p>网络连接异常，请检查网络后重试。</p>
            <button @click="retrySession">重试</button>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            sessionId: null, // 存储当前会话的 session_id
            localStream: null,
            peerConnection: null,
            uiState: 0, // 初始化状态
            UI_IDLE: 0, // 状态：等待
            UI_STARTED: 1, // 状态：推流已开始
            srsUrl: '127.0.0.1',
            backendUrl: 'localhost',
            retryCount: 0,  // 重试次数
            maxRetries: 3,  // 最大重试次数
            showRetryPrompt: false,  // 控制弹窗显示
            mirrored: false // 控制镜像状态
        };
    },
    methods: {
        async startSession() {
            console.log('[startSession] 开始推流并准备拉流');

            // 如果已有会话在进行，提示用户或先停止
            if (this.sessionId) {
                console.warn('已有会话正在进行，请先停止当前会话。');
                return;
            }

            try {
                // 调用后端接口启动会话
                this.sessionId = await this.apiStartSession();
                console.log('会话已启动，session_id:', this.sessionId);

                // 根据 session_id 构建推流和拉流的 streamurl
                const consumeStreamUrl = `webrtc://${this.srsUrl}/live/stream_${this.sessionId}`;
                const produceStreamUrl = `webrtc://${this.srsUrl}/live/processed_stream_${this.sessionId}`;

                // 关闭已有的 peerConnection
                if (this.peerConnection) {
                    this.peerConnection.close();
                    this.peerConnection = null;
                }

                this.peerConnection = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                // 获取本地摄像头和麦克风的流
                this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                this.$refs.localVideo.srcObject = this.localStream;

                // 添加镜像样式（动态绑定）
                this.mirrored = true;
                this.applyMirror();

                // 查看本地视频流
                this.localStream.getVideoTracks().forEach(track => console.log('Local video track:', track));

                // 将音视频轨道添加到 RTCPeerConnection
                this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));

                // 处理 ICE 候选地址
                this.peerConnection.onicecandidate = event => {
                    if (event.candidate) {
                        console.log('[ICE Candidate]', event.candidate);
                    }
                };

                // 创建 SDP Offer 并推送到 SRS
                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);

                console.log('SDP:', offer.sdp);

                // const sdpJson = JSON.stringify({ sdp: offer.sdp, type: 'offer' });

                const resData = {
                    api: `http://${this.srsUrl}:1985/rtc/v1/publish/`,
                    clientip: null,
                    sdp: offer.sdp,
                    streamurl: consumeStreamUrl,
                    tid: String(Math.floor(Math.random() * 100000)),
                    action: 'on_publish'
                };

                try {
                    const response = await fetch('/rtc/v1/publish/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(resData)
                    });

                    if (!response.ok) {
                        const text = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                    }

                    const responseData = await response.json();
                    console.log('Response Data:', responseData);
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
                        type: 'answer',
                        sdp: responseData.sdp
                    }));
                } catch (err) {
                    console.error('Error during startSession:', err);
                    await this.stopSession();
                    return;
                }

                console.log('[startSession] 推流成功，开始拉流');
                await this.startPlaying();

                // 更新 UI 状态
                this.uiState = this.UI_STARTED;
            } catch (error) {
                console.error('Error starting session:', error);
                // 处理启动会话失败的情况，如显示错误提示
            }
        },

        async startPlaying() {
            console.log(`[startPlaying] 尝试拉流，第 ${this.retryCount + 1} 次`);

            const processedStreamUrl = `webrtc://${this.srsUrl}/live/processed_stream_${this.sessionId}`;

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // 添加接收器，指定接收音视频流
            pc.addTransceiver('audio', { direction: 'recvonly' });
            pc.addTransceiver('video', { direction: 'recvonly' });

            // 监听远程视频轨道，绑定到 remoteVideo 元素上
            pc.ontrack = event => {
                console.log('Received remote track:', event.streams[0]);
                this.$refs.remoteVideo.srcObject = event.streams[0];
                console.log('[startPlaying] 拉流成功');
                this.retryCount = 0;  // 重置重试次数
            };

            // 处理 ICE 候选地址
            pc.onicecandidate = event => {
                if (event.candidate) {
                    console.log('[ICE Candidate]', event.candidate);
                }
            };

            // 创建 SDP Offer 并请求 SRS 返回视频流
            const offerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            };

            const offer = await pc.createOffer(offerOptions);
            await pc.setLocalDescription(offer);

            const resData = {
                api: `http://${this.srsUrl}:1985/rtc/v1/play/`,
                clientip: null,
                sdp: offer.sdp,
                streamurl: processedStreamUrl,
                tid: String(Math.floor(Math.random() * 100000)),
                action: 'on_play'
            };

            try {
                const response = await fetch(`rtc/v1/play/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(resData)
                });

                const responseData = await response.json();

                if (responseData.code && responseData.code !== 0) {
                    throw new Error(`SRS Error: code=${responseData.code}, message=${responseData.message}`);
                }

                await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: responseData.sdp }));
            } catch (error) {
                console.error('[startPlaying] 拉流失败', error);
                this.handleRetry();
            }
        },

        handleRetry() {
            this.retryCount++;

            if (this.retryCount < this.maxRetries) {
                console.log(`[handleRetry] 等待 5 秒后重试，第 ${this.retryCount} 次`);
                setTimeout(() => {
                    this.startPlaying();
                }, 5000);
            } else {
                console.log('[handleRetry] 重试 3 次失败，显示弹窗提示用户重试');
                this.showRetryPrompt = true;
            }
        },

        retrySession() {
            console.log('[retrySession] 用户选择重试');
            this.showRetryPrompt = false;
            this.retryCount = 0;
            this.startSession();
        },

        async stopSession() {
            console.log('[stopSession] 停止会话');

            if (!this.sessionId) {
                console.warn('没有进行中的会话可供停止。');
                return;
            }

            try {
                // 调用后端接口停止会话
                await this.apiStopSession(this.sessionId);
                console.log(`会话 ${this.sessionId} 已停止。`);
            } catch (error) {
                console.error(`停止会话 ${this.sessionId} 失败:`, error);
                // 根据需要处理错误，如显示提示信息
            }

            // 关闭 peerConnection
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            // 关闭拉流 peerConnection（假设有一个拉流的 peerConnection）
            if (this.playPeerConnection) {
                this.playPeerConnection.close();
                this.playPeerConnection = null;
            }

            // 停止本地媒体流
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
                this.$refs.localVideo.srcObject = null;
            }

            // 清理远程视频
            if (this.$refs.remoteVideo.srcObject) {
                this.$refs.remoteVideo.srcObject.getTracks().forEach(track => track.stop());
                this.$refs.remoteVideo.srcObject = null;
            }

            // 重置相关状态
            this.sessionId = null;
            this.uiState = this.UI_IDLE;
            this.retryCount = 0;
            this.showRetryPrompt = false;

            // 移除镜像样式
            this.mirrored = false;
            this.applyMirror();
        },
        applyMirror() {
            if (this.mirrored) {
                this.$refs.localVideo.classList.add('mirrored-video');
            } else {
                this.$refs.localVideo.classList.remove('mirrored-video');
            }
        },
        async apiStartSession() {
            try {
                const response = await fetch('api/start_session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                const result = await response.json();
                if (response.ok && result.code === 0) {
                    return result.session_id;
                } else {
                    throw new Error(result.message || 'Failed to start session');
                }
            } catch (error) {
                console.error('Error starting session:', error);
                throw error;
            }
        },

        async apiStopSession(sessionId) {
            try {
                const response = await fetch('api/stop_session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ session_id: sessionId })
                });

                const result = await response.json();
                if (response.ok && result.code === 0) {
                    return true;
                } else {
                    throw new Error(result.message || 'Failed to stop session');
                }
            } catch (error) {
                console.error('Error stopping session:', error);
                throw error;
            }
        }
    },
    mounted() {
        window.onbeforeunload = () => {
            console.log('[Page Unload] 关闭连接');
            this.stopSession();
        };
    }
};
</script>

<style scoped>
.video-wrapper {
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
}

.video-container {
    margin-top: 7%;
    position: relative;
    width: 45%;
    padding-top: 25.3125%; /* 16:9 aspect ratio */
    background: transparent;
    border: 2px solid;
    overflow: hidden;
    border-radius: 10px;
}

.video-placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 15%;
    height: 15%;
}

.video-label {
    position: absolute;
    top: 10px;
    left: 10px;
    color: #fff;
    background: rgba(0, 0, 0, 0.5);
    padding: 5px;
    border-radius: 10px;
}

video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.button-container {
    margin-top: 2%;
    display: flex;
    justify-content: center;
    gap: 20px;
    width: 100%;
}

button.start {
    background-color: #4CAF50; /* 绿色 */
    color: white;
    padding: 10px 20px;
    font-size: 1.2rem;
    cursor: pointer;
    border: none;
    border-radius: 5px;
}

button.start:disabled {
    background-color: #2E7D32; /* 暗绿色 */
    cursor: not-allowed;
}

button.stop {
    background-color: #f44336; /* 红色 */
    color: white;
    padding: 10px 20px;
    font-size: 1.2rem;
    cursor: pointer;
    border: none;
    border-radius: 5px;
}

button.stop:disabled {
    background-color: #B72C20; /* 暗红色 */
    cursor: not-allowed;
}


button {
    padding: 10px 20px;
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
}

.mirrored-video {
    transform: scaleX(-1);
}

.retry_window {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}
</style>