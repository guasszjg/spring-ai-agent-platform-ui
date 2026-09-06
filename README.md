# Spring AI Agent Platform UI

Vue 3 + Vite 管理端，包含登录、智能体管理、模型网关、调试工作台、会话日志与监控页面。

## 本地开发

先启动后端 `http://localhost:8080`，再执行：

```bash
npm install
npm run dev
```

开发地址为 `http://localhost:5173`，`/api` 会代理到后端。

## 生产构建

```bash
npm run build
```

构建产物会写入相邻后端仓库的 `src/main/resources/static`，由 Spring Boot 统一提供。
身份认证使用服务端 Session；API Key 不会持久化到 `localStorage`。
