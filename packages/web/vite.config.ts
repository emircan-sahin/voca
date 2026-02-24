import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
      '@voca/shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 3000,
  },
  appType: 'spa',
});
