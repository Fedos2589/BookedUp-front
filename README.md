# BookedUp — front

SPA на React + TypeScript + Vite. Внутри два продукта: кабинет бизнеса (`/`) и публичная страница записи (`/book/:businessSlug`). Интерфейс — [TedUI](https://github.com/Fedos2589/TedUI).

| Задача | Инструмент |
| --- | --- |
| Роутинг | TanStack Router (`src/app/router.tsx`) |
| API | TanStack Query + Orval (`npm run api:generate` из Swagger бэка) |
| Формы | react-hook-form + zod |
| Состояние | Zustand |
| Даты и переводы | dayjs, i18next |
| Тесты | Vitest, Playwright |
| Мониторинг | Sentry, PostHog — включаются через `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY` |

```bash
npm install
npm run dev           # http://localhost:5173
npm run build
npm run typecheck
npm run lint
npm test
npm run test:e2e      # нужен один раз: npx playwright install chromium
npm run api:generate  # бэк должен быть запущен, см. orval.config.ts
```

## TedUI в Vite

Кит ставится исходниками по тегу (`github:Fedos2589/TedUI#v0.1.0`). Для Vite нужно:

- `vite-plugin-svgr` с `include: '**/*.svg'` — кит импортирует SVG без суффикса `?react`;
- `optimizeDeps.exclude: ['ted-ui']` — пакет из `.tsx`, его компилирует Vite;
- `sass`, `import 'ted-ui/tokens.scss'`, шрифт Montserrat, базовые ресеты (`src/styles/global.scss`);
- `registerUIKitTranslations(i18n)` (`src/i18n.ts`).
