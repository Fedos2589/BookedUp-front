import { defineConfig } from '@playwright/test'

// Runs against the dev server: dependency pre-bundling only happens there,
// and that is where TedUI's CommonJS dependencies break (see vite.config.ts).
export default defineConfig({
  testDir: 'e2e',
  // A forgotten test.only must not turn the rest of the smoke tests off in CI.
  forbidOnly: !!process.env.CI,
  // In CI, an HTML report with traces of the failed tests: the workflow uploads it.
  reporter: process.env.CI ? [['html', { open: 'never' }], ['dot']] : 'list',
  use: { baseURL: 'http://localhost:5180', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: false,
  },
})
