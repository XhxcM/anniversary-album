import { fileURLToPath } from 'node:url';
import { defineConfig, normalizePath } from 'vite';
import vue from '@vitejs/plugin-vue';

const root = normalizePath(fileURLToPath(new URL('.', import.meta.url))).replace(/[()[\]{}!*?+@]/g, '\\$&');

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**',
      `${root}{originals,pictures,important,private}/**`] },
  },
  build: { target: ['es2020', 'safari14'], rolldownOptions: { output: { manualChunks: (id) => id.includes('/three/') ? 'three' : undefined } } },
});
