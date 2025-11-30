import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, './src/components/'),
      '@/data': path.resolve(__dirname, './src/data/'),
      '@/services': path.resolve(__dirname, './src/services/'),
    },
  },
  build: {
    rollupOptions: {
      input: ['src/main.jsx'],
      output: {
        format: 'es',
        entryFileNames: 'main.js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});