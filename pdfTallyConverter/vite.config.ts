import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      'pdfjs-dist': resolve(__dirname, 'node_modules/pdfjs-dist/legacy/build/pdf')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pdfWorker: resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.js')
      }
    }
  }
}); 