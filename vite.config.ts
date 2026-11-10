import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode }) => {
  // .env files too: Vite puts only VITE_* into the app, not into this config's
  // process.env. The prefix '' reads every variable, for this file only.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // TedUI imports `.svg` as React components without the `?react` suffix.
      svgr({ include: '**/*.svg', svgrOptions: { exportType: 'default' } }),
    ],
    server: {
      proxy: {
        // The API on the app's own origin: the back's CSRF check refuses writes from
        // any other. No `changeOrigin`: it would rewrite Host, and from a phone on the
        // LAN (no Sec-Fetch-Site over plain HTTP) the back compares Origin with Host,
        // so every POST would get 403.
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:3000',
          rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ''),
        },
      },
    },
    optimizeDeps: {
      // TedUI ships .tsx sources: Vite compiles it like app code instead of pre-bundling it.
      exclude: ['ted-ui'],
      // Excluding it also skips scanning its imports, so CommonJS packages it uses reach the
      // browser raw ("does not provide an export named 'default'"). List every package the kit
      // imports; update this list when bumping TedUI (`e2e/smoke.spec.ts` catches a miss).
      include: [
        'ted-ui > classnames',
        'ted-ui > @remixicon/react',
        'ted-ui > react-hot-toast',
        'ted-ui > react-phone-number-input',
        'ted-ui > libphonenumber-js/min',
        ...[
          'button',
          'checkbox',
          'combobox',
          'dialog',
          'popover',
          'radio',
          'radio-group',
          'tabs',
          'tooltip',
        ].map((part) => `ted-ui > @base-ui/react/${part}`),
        // DatePicker: dayjs is the app's own dependency (TedUI's optional peer).
        'dayjs',
        'dayjs/plugin/customParseFormat',
        'dayjs/plugin/localizedFormat',
        ...['de', 'es', 'fr', 'id', 'it', 'pl', 'pt', 'ru', 'tr'].map(
          (locale) => `dayjs/locale/${locale}`,
        ),
      ],
    },
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
