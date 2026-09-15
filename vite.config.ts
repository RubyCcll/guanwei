import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
// 后端地址：跟随 CLI 的 PORT/API_PORT（`guanwei start --api 4000` 时前端代理需同步）
const API_TARGET = `http://localhost:${process.env.API_PORT || process.env.PORT || 3018}`;

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  build: {
    // 生产不产出 sourcemap（原 'hidden' 仍生成 .map 文件，随 npm 包分发且可被公开访问 → 源码泄漏）
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  // 生产模式（vite preview / CLI 一键启动）下同样代理 /api 到后端
  preview: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
})