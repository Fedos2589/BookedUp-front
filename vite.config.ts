import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(),
    // TedUI imports `.svg` as React components without the `?react` suffix.
    svgr({ include: '**/*.svg', svgrOptions: { exportType: 'default' } }),
  ],
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
})
