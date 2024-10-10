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
    </div>
</template>

<script>
import kurentoUtils from 'kurento-utils';

export default {
    data() {
        return {
            ws: null,
            webRtcPeer: null,
            uiState: 0,
            UI_IDLE: 0,
            UI_STARTING: 1,
            UI_STARTED: 2
        };
    },
    methods: {
        startSession() {
            console.log("[start] Create WebRtcPeerSendrecv");
            this.setState(this.UI_STARTING);

            const options = {
                localVideo: this.$refs.localVideo,
                remoteVideo: this.$refs.remoteVideo,
                mediaConstraints: { audio: true, video: true },
                onicecandidate: (candidate) => this.sendMessage({
                    id: 'ADD_ICE_CANDIDATE',
                    candidate: candidate,
                }),
            };

            this.webRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, (err) => {
                if (err) {
                    this.sendError("[start/WebRtcPeerSendrecv] Error: " + this.explainUserMediaError(err));
                    this.stopSession();
                    return;
                }

                console.log("[start/WebRtcPeerSendrecv] Created; start local video");
                this.startVideo(this.$refs.localVideo);

                // 添加镜像样式
                this.$refs.localVideo.classList.add('mirrored-video');

                console.log("[start/WebRtcPeerSendrecv] Generate SDP Offer");
                this.webRtcPeer.generateOffer((err, sdpOffer) => {
                    if (err) {
                        this.sendError("[start/WebRtcPeerSendrecv/generateOffer] Error: " + err);
                        this.stopSession();
                        return;
                    }

                    this.sendMessage({
                        id: 'PROCESS_SDP_OFFER',
                        sdpOffer: sdpOffer,
                    });

                    console.log("[start/WebRtcPeerSendrecv/generateOffer] Done!");
                    this.setState(this.UI_STARTED);
                });
            });
        },
        stopSession() {
            if (this.uiState === this.UI_IDLE) {
                console.log("[stop] Skip, already stopped");
                return;
            }

            console.log("[stop]");
            if (this.webRtcPeer) {
                this.webRtcPeer.dispose();
                this.webRtcPeer = null;
            }

            this.setState(this.UI_IDLE);

            this.sendMessage({ id: 'STOP' });
        },
        sendMessage(message) {
            if (this.ws.readyState !== WebSocket.OPEN) {
                console.warn("[sendMessage] Skip, WebSocket session isn't open");
                return;
            }
            const jsonMessage = JSON.stringify(message);
            console.log("[sendMessage] message: " + jsonMessage);
            this.ws.send(jsonMessage);
        },
        setState(newState) {
            this.uiState = newState;
        },
        startVideo(video) {
            video.play().catch(err => {
                console.error("[start] Error in video.play(): " + err);
            });
        },
        explainUserMediaError(err) {
            const n = err.name;
            if (n === 'NotFoundError' || n === 'DevicesNotFoundError') {
                return "Missing webcam for required tracks";
            } else if (n === 'NotReadableError' || n === 'TrackStartError') {
                return "Webcam is already in use";
            } else if (n === 'OverconstrainedError' || n === 'ConstraintNotSatisfiedError') {
                return "Webcam doesn't provide required tracks";
            } else if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
                return "Webcam permission has been denied by the user";
            } else if (n === 'TypeError') {
                return "No media tracks have been requested";
            } else {
                return "Unknown error: " + err;
            }
        },
        sendError(message) {
            console.error(message);
            this.sendMessage({ id: 'ERROR', message: message });
        },
        handleProcessSdpAnswer(jsonMessage) {
            console.log("[handleProcessSdpAnswer] SDP Answer from Kurento, process in WebRTC Peer");
            if (this.webRtcPeer == null) {
                console.warn("[handleProcessSdpAnswer] Skip, no WebRTC Peer");
                return;
            }

            this.webRtcPeer.processAnswer(jsonMessage.sdpAnswer, (err) => {
                if (err) {
                    this.sendError("[handleProcessSdpAnswer] Error: " + err);
                    this.stopSession();
                    return;
                }
                console.log("[handleProcessSdpAnswer] SDP Answer ready; start remote video");
                this.startVideo(this.$refs.remoteVideo);
                this.setState(this.UI_STARTED);
            });
        },
        handleAddIceCandidate(jsonMessage) {
            if (this.webRtcPeer == null) {
                console.warn("[handleAddIceCandidate] Skip, no WebRtc Peer");
                return;
            }
            this.webRtcPeer.addIceCandidate(jsonMessage.candidate, (err) => {
                if (err) {
                    console.error("[handleAddIceCandidate] " + err);
                }
            });
        },
        handleError(jsonMessage) {
            const errMessage = jsonMessage.message;
            console.error("Kurento error: " + errMessage);
            console.log("Assume that the other side stops after an error...");
            this.stopSession();
        }
    },
    mounted() {
        this.ws = new WebSocket('wss://' + 'localhost:7080' + '/mere_ws_server');
        console.log("ws: " + this.ws.url)
        this.ws.onmessage = (message) => {
            const jsonMessage = JSON.parse(message.data);
            console.log("[onmessage] Received message: " + message.data);

            switch (jsonMessage.id) {
                case 'PROCESS_SDP_ANSWER':
                    this.handleProcessSdpAnswer(jsonMessage);
                    break;
                case 'ADD_ICE_CANDIDATE':
                    this.handleAddIceCandidate(jsonMessage);
                    break;
                case 'ERROR':
                    this.handleError(jsonMessage);
                    break;
                default:
                    console.warn("[onmessage] Invalid message, id: " + jsonMessage.id);
                    break;
            }
        };
        window.onbeforeunload = () => {
            console.log("Page unload - Close WebSocket");
            this.ws.close();
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
</style>
