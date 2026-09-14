import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/open': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: fileURLToPath(new URL(
      fs.existsSync(fileURLToPath(new URL('../spring_ai', import.meta.url)))
        ? '../spring_ai/src/main/resources/static'
        : '../spring-ai-agent-platform/src/main/resources/static',
      import.meta.url
    )),
    emptyOutDir: true
  }
})
