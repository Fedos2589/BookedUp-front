# BookedUp — front

A SPA on React + TypeScript + Vite. It holds two products: the business cabinet (`/`) and the public booking page (`/book/:businessSlug`). The UI is [TedUI](https://github.com/Fedos2589/TedUI).

| Task           | Tool                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| Routing        | TanStack Router (`src/app/router.tsx`)                                  |
| API            | TanStack Query + Orval (`npm run api:generate` from the back's Swagger) |
| Forms          | react-hook-form + zod                                                   |
| State          | Zustand                                                                 |
| Dates and i18n | dayjs, i18next                                                          |
| Tests          | Vitest, Playwright                                                      |
| Monitoring     | Sentry, PostHog — enabled by `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`      |

```bash
npm install
npm run dev           # http://localhost:5173
npm run build
npm run typecheck
npm run lint
npm test
npm run test:e2e      # dev server + browser, catches page errors; once: npx playwright install chromium --only-shell
npm run api:generate  # the back must be running, see orval.config.ts
```

## TedUI in Vite

The kit is installed as source by tag (`github:Fedos2589/TedUI#v0.1.0`). Vite needs:

- `vite-plugin-svgr` with `include: '**/*.svg'` — the kit imports SVGs without the `?react` suffix;
- `optimizeDeps.exclude: ['ted-ui']` — the package is `.tsx`, Vite compiles it;
- `optimizeDeps.include` with every package the kit imports (`classnames`, `@base-ui/react/*`, dayjs…) — otherwise in dev their CommonJS reaches the browser as is: `does not provide an export named 'default'`;
- `verbatimModuleSyntax: false` in `tsconfig.app.json` — tsc also checks the kit's sources, and the kit imports types without `import type`;
- `sass`, `import 'ted-ui/tokens.scss'`, the Montserrat font, base resets (`src/styles/global.scss`);
- `registerUIKitTranslations(i18n)` (`src/i18n.ts`).
