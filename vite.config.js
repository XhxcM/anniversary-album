import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: { target: ['es2020', 'safari14'], rolldownOptions: { output: { manualChunks: (id) => id.includes('/three/') ? 'three' : undefined } } },
});
