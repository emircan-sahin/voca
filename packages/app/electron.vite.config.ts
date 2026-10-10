import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Resolved from the renderer config; vite only exposes .env values through config.env
let rendererApiUrl = '';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/main/index.ts'),
      },
    },
    resolve: {
      alias: {
        '~': resolve(__dirname, 'electron/main'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/index.html'),
          overlay: resolve(__dirname, 'src/overlay.html'),
        },
      },
    },
    resolve: {
      alias: {
        '~': resolve(__dirname, 'src'),
        '@voca/shared': resolve(__dirname, '../shared/src'),
      },
    },
    plugins: [
      react(),
      // The dev backend runs on localhost; a packaged build talking to production must not be able
      // to reach local services, so the CSP entry is dropped unless the build targets a localhost API.
      {
        name: 'strip-localhost-csp',
        apply: 'build',
        configResolved(config) {
          rendererApiUrl = config.env.VITE_API_BASE_URL ?? '';
        },
        transformIndexHtml(html) {
          if (/^https?:\/\/localhost[:/]/.test(rendererApiUrl)) return html;
          return html.replace(' http://localhost:*', '');
        },
      },
    ],
  },
});
