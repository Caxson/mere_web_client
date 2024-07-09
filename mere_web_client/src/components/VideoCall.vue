<template>
    <div>
        <video ref="localVideo" autoplay playsinline></video>
        <video ref="remoteVideo" autoplay playsinline></video>
        <button @click="startCall">Start Call</button>
        <button @click="endCall">End Call</button>
        <button @click="playVideo">Play Video</button>
    </div>
</template>

<script>
import io from 'socket.io-client';

export default {
    data() {
        return {
            peerConnection: null,
            localStream: null,
            socket: null,
            pendingCandidates: [],
            error: null,
            user_id: 'ghjgj'
        };
    },
    methods: {
        startCall() {
            // 确保WebSocket已连接
            if (this.socket && this.socket.connected) {
                this.initiateWebRTCCall();
            } else {
                console.log('Waiting for WebSocket connection...');
                this.socket.on('connect', () => {
                    console.log('WebSocket connected, initiating call...');
                    this.initiateWebRTCCall();
                });
            }
        },
        initiateWebRTCCall() {
            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            // 设置ICE和track事件处理程序
            this.setEventHandlers();

            // 创建和发送offer
            this.createAndSendOffer();
        },
        setEventHandlers() {
            this.peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    console.log('Generated ICE candidate:', event.candidate);
                    this.socket.emit('candidate', { user_id: this.user_id, candidate: event.candidate });
                }
            };

            this.peerConnection.ontrack = event => {
                console.log('Remote track received:', event.track);
                const [remoteStream] = event.streams;
                this.$refs.remoteVideo.srcObject = remoteStream;
                console.log('Remote video stream set to:', remoteStream);
            };
        },
        createAndSendOffer() {
            this.peerConnection.createOffer()
                .then(offer => {
                    console.log('Created offer:', offer);
                    return this.peerConnection.setLocalDescription(offer);
                })
                .then(() => {
                    this.socket.emit('offer', { offer: this.peerConnection.localDescription });
                })
                .catch(error => {
                    console.error('Error creating offer:', error);
                });
        },
        endCall() {
            try {
                this.error = null;

                // 停止本地媒体流
                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => track.stop());
                }

                // 关闭RTCPeerConnection
                if (this.peerConnection) {
                    this.peerConnection.close();
                    this.peerConnection = null;
                }

                // 断开与信令服务器的连接
                if (this.socket) {
                    this.socket.disconnect();
                    this.socket = null;
                }

                // 清除视频元素的srcObject
                this.$refs.localVideo.srcObject = null;
                this.$refs.remoteVideo.srcObject = null;

                console.log('Call ended.');
            } catch (error) {
                console.error('Error ending call:', error);
                this.error = 'Error ending call: ' + error.message;
            }
        },
        logVideoElementState() {
            console.log('Video element state:', {
                readyState: this.$refs.remoteVideo.readyState,
                paused: this.$refs.remoteVideo.paused,
                currentTime: this.$refs.remoteVideo.currentTime,
                srcObject: this.$refs.remoteVideo.srcObject,
                duration: this.$refs.remoteVideo.duration
            });
        },
        playVideo() {
            if (this.$refs.remoteVideo.srcObject) {
                this.logVideoElementState();
                console.log('Video element:', {
                    video: this.$refs.remoteVideo
                });
                console.log('Attempting to play video...');
                this.$refs.remoteVideo.play().then(() => {
                    console.log('Video is playing.');
                }).catch(error => {
                    console.error('Error trying to play video:', error);
                });
            } else {
                console.log('No video stream to play.');
            }
        }
    },
    mounted() {
        this.socket = io('http://localhost:13000');

        this.socket.on('answer', async data => {
            console.log('Received answer from server:', data.answer);
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('Remote description set.');

            const candidates = data.candidates;
            for (const candidate of candidates) {
                try {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('Candidate added:', candidate);
                } catch (e) {
                    console.error('Error adding candidate:', e);
                }
            }
        });

        this.socket.on('candidate', async data => {
            console.log('Received candidate from server:', data.candidate);
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('Candidate added:', data.candidate);
            } catch (e) {
                console.error('Error adding candidate:', e);
            }
        });
    }
};
</script>

<style scoped>
video {
    width: 300px;
    height: 200px;
    border: 1px solid black;
    margin: 5px;
    display: block;
    background: black;
}


button {
    margin-top: 10px;
}
</style>
