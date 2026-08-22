import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  build: {
    sourcemap: 'hidden',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3018',
        changeOrigin: true,
      },
    },
  },
  // 生产模式（vite preview / CLI 一键启动）下同样代理 /api 到后端
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:3018',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tsconfigPaths()
  ],
})