import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], physics: ['@dimforge/rapier3d-compat'] },
      },
    },
    // Rapier compatibility includes its WASM binary in the physics chunk.
    chunkSizeWarningLimit: 3000,
  },
});
