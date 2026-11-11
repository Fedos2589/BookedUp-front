import { defineConfig } from '@playwright/test'

// The service worker exists only in a build: these tests run against
// `vite preview` of dist/ (run `npm run build` first; CI does).
export default defineConfig({
  testDir: 'e2e-pwa',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['dot']] : 'list',
  use: { baseURL: 'http://localhost:5190', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite preview --port 5190 --strictPort',
    url: 'http://localhost:5190',
    reuseExistingServer: false,
  },
})
