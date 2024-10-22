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
        // '/rtc':  'http://101.126.157.152:1985',
            '/rtc':  'http://123.56.254.166:1985',
        }
    }
})
