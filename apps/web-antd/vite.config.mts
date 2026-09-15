import { defineConfig } from '@vben/vite-config';
import path from 'path'; // 引入 path 模块

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        // 允许 ngrok 等公网域名访问开发服（否则 Host 校验返回 403）
        allowedHosts: true,
        proxy: {
          '/api/v1': {
            changeOrigin: true,
            target: 'http://localhost:8080',
            ws: true,
          },
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            target: 'http://localhost:8889/api',
            ws: true,
          },
          // 公网报障/访客/问卷等由后端托管的静态页
          '/public': {
            changeOrigin: true,
            target: 'http://localhost:8889',
          },
        },
      },
      resolve: {
        alias: {
          '#': path.resolve(__dirname, 'src'),
        },
      },
    },
  };
});
