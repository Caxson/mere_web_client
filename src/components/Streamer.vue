<template>
  <div>
    <h1>RTMP Streamer</h1>
    <video id="localVideo" autoplay muted></video>
    <button @click="startStreaming">Start Streaming</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      mediaRecorder: null,
    };
  },
  methods: {
    async startStreaming() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const localVideo = this.$refs.localVideo;
      localVideo.srcObject = stream;

      const socket = new WebSocket('ws://localhost:8080/stream');
      socket.binaryType = 'arraybuffer';

      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socket.send(event.data);
        }
      };
      this.mediaRecorder.start(1000); // 1 second intervals
    },
  },
};
</script>

<style scoped>
video {
  width: 100%;
  height: auto;
}
</style>
