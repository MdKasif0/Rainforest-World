import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, strictPort: true, hmr: false, watch: { ignored: ['**/out/**', '**/ref/**', '**/tools/**', '**/shots/**'] } },
  optimizeDeps: { include: ['three'] },
});
