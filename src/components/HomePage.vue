<template>
  <div>
    <div class="intro">
      <h1>mere</h1>
      <p>Next-generation AI-powered platform for interactive video and content creation.</p>
    </div>
    <div class="videos">
      <div class="video-container">
        <video controls poster="@/assets/video_bg1.webp" class="video">
          <source src="@/assets/video1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <router-link to="/videos">
          <button class="play-button">视频通话</button>
        </router-link>
      </div>
      <div class="video-container">
        <video controls poster="@/assets/video_bg2.webp" class="video">
          <source src="@/assets/video2.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <router-link to="/text">
          <button class="play-button">文字聊天</button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomePage'
};
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
  sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

main {
  padding: 2rem;
}

.intro {
  margin-bottom: 6rem;
}

.intro h1 {
  font-size: 3.5rem;
  margin-bottom: 2rem;
}

.intro p {
  font-size: 1.5rem;
  margin: 0;
}

.videos {
  display: flex;
  justify-content: space-around;
  align-items: center;

}

.video-container {
  position: relative;
  width: 45%;
}

video {
  width: 100%;
  height: auto;
  border-radius: 10px;
}

.play-button {
  display: block;
  margin: 1rem auto;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  color: black;
  background-color: white;
  border: none;
  border-radius: 30px;
  cursor: pointer;
}

.play-button:hover {
  background-color: #e0e0e0;
}

a {
  text-decoration: none;
}

</style>

