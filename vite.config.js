import { defineConfig } from 'vite'
import cesium from 'vite-plugin-cesium'
import vue from '@vitejs/plugin-vue'


export default defineConfig(({ mode, command })=>{
  return {
    plugins: [vue(),cesium()],
    css: {
    },
    server: {
      port: 80,
      host: true,
      open: true,
      proxy: {
        // 高程导出 CES
        '/map': {
          target: `http://192.168.3.111:8080/`,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/mapimg/, '')
        },
      }
    },
  }
})
