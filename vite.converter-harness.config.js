import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, 'tests/converter-browser/harness'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5199,
    strictPort: true,
  },
});
