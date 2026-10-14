import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: 'http://127.0.0.1:4335',
    viewport: { width: 1440, height: 1020 },
  },
  webServer: {
    command: 'npx vite preview --outDir dist --host 127.0.0.1 --port 4335 --strictPort',
    port: 4335,
    reuseExistingServer: !process.env.CI,
  },
});
