import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import { defineConfig } from 'vitest/config';

// Shadowfolk is fully procedural: no asset pipeline, no scene JSON.
// The IWSDK dev plugin injects the IWER emulator on localhost so the
// XR session (including hand tracking) can be driven from a desktop browser.
export default defineConfig({
  plugins: [
    iwsdkDev({
      emulator: { device: 'metaQuest3' },
      workspace: { enabled: false },
    }),
  ],
  server: { host: '0.0.0.0', port: 8081, open: false },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'esnext',
    chunkSizeWarningLimit: 2500,
    rollupOptions: { input: './index.html' },
  },
  esbuild: { target: 'esnext' },
  resolve: { dedupe: ['three'] },
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
