import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { serializeNavMenuSchema } from './src/config/navMenus.js'

const backendDir = fileURLToPath(new URL(
  fs.existsSync(fileURLToPath(new URL('../spring_ai', import.meta.url)))
    ? '../spring_ai'
    : '../spring-ai-agent-platform',
  import.meta.url
))

/** 构建时同步导出前端菜单清单给后端能力清单单测校验，防止前后端菜单名漂移 */
function exportFrontendMenusPlugin() {
  return {
    name: 'export-frontend-menus',
    buildStart() {
      const target = path.join(backendDir, 'src/main/resources/assistant/frontend-menus.json')
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, JSON.stringify(serializeNavMenuSchema(), null, 2) + '\n', 'utf-8')
    }
  }
}

export default defineConfig({
  plugins: [vue(), exportFrontendMenusPlugin()],
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
    outDir: path.join(backendDir, 'src/main/resources/static'),
    emptyOutDir: true
  }
})
