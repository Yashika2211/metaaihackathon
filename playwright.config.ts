import { defineConfig } from '@playwright/test';

// Smoke tests run against the Vite dev server, where the IWSDK plugin injects
// the IWER emulator so a real (emulated) immersive session can be entered.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  use: {
    baseURL: 'https://localhost:8081',
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npx vite --port 8081 --strictPort',
    url: 'https://localhost:8081',
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
