import { defineConfig } from '@playwright/test'

// Runs against the dev server: dependency pre-bundling only happens there,
// and that is where TedUI's CommonJS dependencies break (see vite.config.ts).
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5180' },
  webServer: {
    command: 'npm run dev -- --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: false,
  },
})
