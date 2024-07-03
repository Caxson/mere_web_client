<template>
  <div id="app">
    <header>
      <div class="logo-container">
        <img src="@/assets/mere_logo.png" alt="Mere Logo" class="logo" />
        <img src="@/assets/mere_d.webp" alt="Mere" class="logo"/>
      </div>
      <nav>
        <ul>
          <li><router-link to="/">首页</router-link></li>
          <li><router-link to="/videos">视频</router-link></li>
          <li><router-link to="/text">文字</router-link></li>
          <li><a href="#download">下载</a></li>
          <li><a href="#contact">联系</a></li>
        </ul>
      </nav>
    </header>
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'App'
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

#app {
  text-align: center;
  background: linear-gradient(to bottom, #314251, #789876);
  min-height: 100vh;
  color: white;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.logo-container {
  display: flex;
  align-items: center;
}

.logo {
  height: 40px;
  margin-right: 10px;
}

nav ul {
  list-style: none;
  display: flex;
  gap: 3.5rem;
  padding: 0;
  margin-right: 2rem;
}

nav a, nav router-link {
  color: white;
  text-decoration: none;
  font-size: 1.2rem;
}

a {
  text-decoration: none;
}
</style>
