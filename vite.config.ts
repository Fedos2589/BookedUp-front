import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(),
    // TedUI imports `.svg` as React components without the `?react` suffix.
    svgr({ include: '**/*.svg', svgrOptions: { exportType: 'default' } }),
  ],
  // TedUI ships .tsx sources: let Vite compile it instead of pre-bundling it with esbuild.
  optimizeDeps: { exclude: ['ted-ui'] },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
