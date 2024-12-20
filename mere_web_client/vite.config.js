import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
    server: {
        proxy: {
        // '/rtc':  'http://<backendUrl>:1985',
            '/rtc':  'http://<srsUrl>:1985',
            '/api': {
                target: 'http://<backendUrl>:8010',
                changeOrigin: true,
                // rewrite: (path) => path.replace(/^\/api/, '')
            },
            // '/api':  'http://localhost:8010',
        }
    }
})
