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
            localStream: null,
            peerConnection: null,
            uiState: 0, // 初始化状态
            UI_IDLE: 0, // 状态：等待
            UI_STARTED: 1, // 状态：推流已开始
            srsUrl: 'http://101.126.157.152:1985/rtc/v1',
            retryCount: 0,  // 重试次数
            maxRetries: 3,  // 最大重试次数
            showRetryPrompt: false,  // 控制弹窗显示
            mirrored: false // 控制镜像状态
        };
    },
    methods: {
        async startSession() {
            console.log('[startSession] 开始推流并准备拉流');

            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // 获取本地摄像头和麦克风的流
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.$refs.localVideo.srcObject = this.localStream;

            // 添加镜像样式（动态绑定）
            this.mirrored = true;
            this.applyMirror();

            // 将音视频轨道添加到 RTCPeerConnection
            this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));

            // 处理 ICE 候选地址
            this.peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    console.log('[ICE Candidate]', event.candidate);
                }
            };

            const offerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            };

            // 创建 SDP Offer 并推送到 SRS
            const offer = await this.peerConnection.createOffer(offerOptions);
            await this.peerConnection.setLocalDescription(offer);

            console.log('SDP:', offer.sdp);

            const sdpJson = JSON.stringify({ sdp: offer.sdp, type: 'offer' });

            const resData = {
                api: 'http://123.56.254.166:1985/rtc/v1/publish/',
                clientip: null,
                sdp: offer.sdp,
                streamurl: 'webrtc://123.56.254.166/live/stream',
                tid: String(Math.floor(Math.random() * 100000)),
                action: 'on_publish'
            };

            const response = await fetch('/rtc/v1/publish/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(resData)
            }).then(res => console.log(res), err => console.log(err));

            const data = await response.json();
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data));

            console.log('[startSession] 推流成功，开始拉流');
            await this.startPlaying();
        },

        // async startSession() {
        //     console.log('[startSession] 开始推流并准备拉流');
        //
        //     // 创建 RTCPeerConnection
        //     this.peerConnection = new RTCPeerConnection({
        //         iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        //     });
        //
        //     // 处理 ICE 候选
        //     this.peerConnection.onicecandidate = event => {
        //         if (event.candidate) {
        //             signalingSocket.send(JSON.stringify({ 'candidate': event.candidate }));
        //         }
        //     };
        //
        //     // 获取本地摄像头和麦克风的流
        //     this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        //     this.$refs.localVideo.srcObject = this.localStream;
        //
        //     // 将音视频轨道添加到 RTCPeerConnection
        //     this.localStream.getTracks().forEach(track => this.peerConnection.addTrack(track, this.localStream));
        //
        //     // 创建 SDP Offer 并发送到 SRS
        //     const offer = await this.peerConnection.createOffer();
        //     await this.peerConnection.setLocalDescription(offer);
        //
        //     console.log('SDP:', offer.sdp);
        //
        //     // 通过 WebSocket 连接到 SRS 的 WebRTC 信令服务器
        //     const signalingSocket = new WebSocket('ws://123.56.254.166:8000/rtc/v1/signaling');
        //
        //     signalingSocket.onopen = () => {
        //         console.log('信令服务器连接成功');
        //         signalingSocket.send(JSON.stringify({ 'sdp': offer }));
        //     };
        //
        //     signalingSocket.onmessage = async (message) => {
        //         const data = JSON.parse(message.data);
        //         if (data.sdp) {
        //             await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        //             if (data.sdp.type === 'offer') {
        //                 const answer = await this.peerConnection.createAnswer();
        //                 await this.peerConnection.setLocalDescription(answer);
        //                 signalingSocket.send(JSON.stringify({ 'sdp': answer }));
        //             }
        //         } else if (data.candidate) {
        //             await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        //         }
        //     };
        //
        //     signalingSocket.onerror = (error) => {
        //         console.error('信令服务器连接错误:', error);
        //     };
        //
        //     signalingSocket.onclose = () => {
        //         console.log('信令服务器连接关闭');
        //     };
        //
        //     console.log('[startSession] 推流成功，开始拉流');
        //     await this.startPlaying();
        // },

        async startPlaying() {
            console.log(`[startPlaying] 尝试拉流，第 ${this.retryCount + 1} 次`);

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // 监听远程视频轨道，绑定到 remoteVideo 元素上
            pc.ontrack = event => {
                this.$refs.remoteVideo.srcObject = event.streams[0];
                console.log('[startPlaying] 拉流成功');
                this.retryCount = 0;  // 重置重试次数
            };

            // 创建 SDP Offer 并请求 SRS 返回视频流
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            try {
                const response = await fetch(`rtc/play/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sdp: offer.sdp, type: 'offer' })
                });

                const data = await response.json();
                await pc.setRemoteDescription(new RTCSessionDescription(data));
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

        stopSession() {
            console.log('[stopSession] 停止会话');

            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
        },
        applyMirror() {
            if (this.mirrored) {
                this.$refs.localVideo.classList.add('mirrored-video');
            } else {
                this.$refs.localVideo.classList.remove('mirrored-video');
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
