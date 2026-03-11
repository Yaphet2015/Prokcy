import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['monaco-editor', '@monaco-editor/react'],
  },
  build: {
    outDir: 'dist-react',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/monaco-editor') || id.includes('node_modules/@monaco-editor/react')) {
            return 'monaco';
          }

          if (
            id.includes('node_modules/react')
            || id.includes('node_modules/react-dom')
            || id.includes('node_modules/@pikoloo/darwin-ui')
            || id.includes('node_modules/lucide-react')
          ) {
            return 'vendor';
          }

          return undefined;
        },
      },
    },
  },
});
