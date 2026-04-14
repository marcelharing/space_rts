import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        start: 'start.html',
        level1: 'level-1.html',
        level2: 'level-2.html',
        level3: 'level-3.html',
      },
    },
  },
});
