# BookedUp — front

SPA на React + TypeScript + Vite. Бэк — репозиторий BookedUp-back (NestJS), связь через его Swagger.

@node_modules/ted-ui/docs/agents/usage.md

## Что где

- `src/app/router.tsx` — все маршруты (TanStack Router, code-based). Два продукта:
  - кабинет бизнеса (`/`) — владелец, админ, мастер;
  - публичная страница записи (`/book/$businessSlug`) — клиент, с телефона, должна оставаться лёгкой.
- `src/pages/` — страницы, `src/app/` — провайдеры и роутер.
- `src/api/` — **генерируется Orval** (`npm run api:generate`, бэк должен быть запущен). Руками не правится: следующая генерация затрёт. Нужен другой тип или эндпоинт — меняется бэк.
- `src/i18n.ts` — i18next; `src/monitoring.ts` — Sentry и PostHog, включаются только по env.

## Правила

- Интерфейс — из TedUI (правила выше, в `usage.md`). Не хватает компонента или вида — это изменение в ките, не локальная копия и не переопределение стилей.
- Данные с сервера — только через сгенерированные хуки TanStack Query. Zustand — для состояния клиента (UI, черновики), не кэш серверных данных.
- Формы — react-hook-form + zod; схема валидации рядом с формой.
- Даты — dayjs с utc/timezone. С бэка время приходит в UTC, показывается в часовом поясе бизнеса, а не браузера.
- Env — только `VITE_*`, объявлены в `src/vite-env.d.ts`.

## TedUI в Vite — не «чистить»

Эти настройки выглядят лишними, но без них кит не работает:

- `vite-plugin-svgr` с `include: '**/*.svg'` и `exportType: 'default'` — кит импортирует SVG без `?react`;
- `optimizeDeps.exclude: ['ted-ui']` — пакет поставляется исходниками `.tsx`;
- `optimizeDeps.include` — все пакеты, которые импортирует кит. Без этого в dev-режиме (сборка не ловит!) CommonJS-зависимость падает в браузере с `does not provide an export named …`. При обновлении TedUI сверить список с его импортами и прогнать `npm run test:e2e`;
- `verbatimModuleSyntax: false` — tsc проверяет исходники кита, а они импортируют типы без `import type`;
- `import 'ted-ui/tokens.scss'` в `main.tsx`, ресеты в `src/styles/global.scss`, Montserrat в `index.html`;
- `registerUIKitTranslations(i18n)` в `src/i18n.ts`.

Кит ставится по тегу (`github:Fedos2589/TedUI#vX.Y.Z`); `node_modules/ted-ui` не редактировать.

## Проверки

Что запускается само:

- **pre-commit** (husky + lint-staged): `oxlint --fix` и Prettier на добавленных в коммит файлах. Ошибку линтера, которую не исправить автоматически, хук не пропустит — чините, а не `--no-verify`.
- **pre-push**: `npm run typecheck` и `npm test`.
- **CI** (`.github/workflows/ci.yml`) на каждом PR и на main: `format:check`, `lint`, `typecheck`, `test`, `build`, `test:e2e`. PR мержится с зелёным CI.

Форматирование — Prettier с конфигом TedUI (`.prettierrc` тот же, что в ките): `npm run format`. В npm-пакет кита конфиг не попадает: если в ките поменяли `.prettierrc`, скопируйте его сюда при обновлении TedUI. Линтер — `oxlint --deny-warnings`: предупреждение валит и хук, и CI. Node — `>=22.22.1` (`.nvmrc`, `engines`; этого требует lint-staged). Хуки ставит `npm install` (скрипт `prepare`). Все файлы в репозитории с LF (`.gitattributes`): с CRLF скрипты хуков не запускаются.

Перед PR вручную то же, что в CI:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run test:e2e` — Playwright на dev-сервере, падает на любой ошибке страницы (один раз нужен `npx playwright install chromium --only-shell`). Обязателен после изменений `vite.config.ts` и обновления TedUI: `build` проблемы dev-режима не видит.
