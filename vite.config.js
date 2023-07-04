import { defineConfig } from 'vite'
import cesium from 'vite-plugin-cesium'
import vue from '@vitejs/plugin-vue'


export default defineConfig(({ mode, command })=>{
  return {
    plugins: [vue(),cesium()],
    css: {
    }
  }
})
