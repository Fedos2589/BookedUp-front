# BookedUp — front

SPA на React + TypeScript + Vite. Бэк — репозиторий BookedUp-back (NestJS), связь через его Swagger.

@node_modules/ted-ui/docs/agents/usage.md

## Что где

- `src/app/router.tsx` — все маршруты (TanStack Router, code-based). Два продукта:
  - кабинет бизнеса (`/`) — владелец, админ, мастер;
  - публичная страница записи (`/book/$businessSlug`) — клиент, с телефона, должна оставаться лёгкой.
- `src/pages/` — страницы, `src/app/` — провайдеры и роутер.
- `src/api/` — **генерируется Orval** (`npm run api:generate`, бэк должен быть запущен). Руками не правится: следующая генерация затрёт. Нужен другой тип или эндпоинт — меняется бэк.
- `src/apiFetch.ts` — fetch, через который ходит весь сгенерированный клиент (`mutator` в `orval.config.ts`): ответ не 2xx бросает `ApiError` со `status` и телом, хуки отдают само тело.
- `src/auth/session.ts` — сессия: `requireAccount` (beforeLoad кабинета: 401 на `GET /me` → `/sign-in`) и `redirectIfSignedIn` (страницы входа и регистрации). Ответ `/me` моложе 30 с берётся из кэша, старше — запрашивается снова.
- `src/app/createApp.ts` — кэш запросов и роутер вместе. 401 на любой запрос при известном аккаунте = сессия кончилась: кэш очищается, переход на `/sign-in`. Отдельно обрабатывать 401 в экранах не нужно.
- `src/i18n.ts` — i18next, строки в `src/locales/{en,ru}.json`; `src/monitoring.ts` — Sentry и PostHog, включаются только по env.
- **Кабинет** — маршрут-обёртка `cabinet` в `src/app/router.tsx`: проверка сессии (`requireAccount`) один раз, экран ошибки и `CabinetLayout` (навигация, «Выйти»). Новая страница кабинета — его дочерний маршрут (`getParentRoute: () => cabinetRoute`) и пункт в навигации; своей проверки сессии и шапки у неё нет. Данные, которые уже есть в `GET /me`, берутся оттуда, без отдельного запроса.
- `src/business/currentBusiness.ts` — `currentBusinessOf(account)`: с каким бизнесом работает кабинет (пока первый бизнес аккаунта; выбор между несколькими потом поменяет одну функцию). Бизнеса может не быть (сняли последнее членство) — тогда `CabinetLayout` вместо страниц показывает экран «вы не состоите в бизнесе» с выходом. Страницы кабинета берут бизнес через `useCurrentBusiness()`: его кладёт `CabinetLayout`, и страница без бизнеса не рендерится.
- `src/business/roles.ts` — что какая роль **видит** в кабинете (`roleCan(role, 'viewSettings')`). Что роль **может**, решает бэк (его `src/business/roles.ts`) и отвечает 403; здесь только не показываем то, чем роль не сможет воспользоваться. Пункт навигации и сама страница проверяют одну и ту же способность: страница, открытая по адресу, уводит на `/`. Кем роль управляет в команде (`rolesManagedBy`, `roleManages`) — копия таблицы `manages` бэка: поменяли там — меняем здесь.
- `src/pages/team/` — «Команда» (`/team`, владелец и админы): участники, приглашения, мастера без аккаунта. Каждая секция грузит свой список; после любого изменения, и неудачного тоже, `useReloadTeam()` перезагружает все три — одно действие двигает несколько списков (принятое приглашение становится участником, у удалённого остаётся расписание). 404/409 = команду уже изменили, текст `team.changedMeanwhile`. Ссылка приглашения показывается один раз (бэк хранит только хэш токена).
- `src/dates.ts` — dayjs с utc/timezone; всё время на экране — через него и в часовом поясе бизнеса (`timeIn(момент, business.timeZone)`).
- `src/test/` — `renderApp(path)` (всё приложение на memory history со своим кэшем) и `fakeApi` (подменяет fetch ответами по маршрутам и записывает запросы).

## Правила

- Интерфейс — из TedUI (правила выше, в `usage.md`). Не хватает компонента или вида — это изменение в ките, не локальная копия и не переопределение стилей.
- Данные с сервера — только через сгенерированные хуки TanStack Query. Zustand — для состояния клиента (UI, черновики), не кэш серверных данных.
- Формы — react-hook-form + zod; схема валидации рядом с формой.
- Даты — dayjs с utc/timezone, всё через `src/dates.ts`. С бэка время приходит в UTC, показывается в часовом поясе бизнеса, а не браузера. Исключение — дата с названием месяца: `dateTimeIn` форматирует её через Intl на языке приложения (у dayjs для этого пришлось бы грузить локали).
- Импорты из другой папки `src/` — через `@/` (`import { currentBusinessOf } from '@/business/currentBusiness'`), не относительно; `./` — только файлы своей же папки (стили страницы, соседний модуль), не подпапки. `@/` = `src/` описан в одном месте — `paths` в `tsconfig.app.json`; Vite берёт его оттуда (`resolve.tsconfigPaths`). oxlint (`no-restricted-imports`, только в `src/`) запрещает `..`, `../…` и `./папка/…`. В `e2e/` и `scripts/` `@/` нет. Сгенерированный `src/api/` не трогаем: его импорты пишет Orval.
- **Один компонент — один файл**, файл назван по компоненту (`AcceptInvitation.tsx`). Страница — папка в `src/pages/`: в главном файле только сама страница, её части (форма, диалог, секция, экран ошибки) — соседние файлы. Хелперы туда же, отдельными модулями: чистые функции (`joinErrors.ts`, `inviteText.ts`), схема формы (`joinForm.ts`), хуки (`useOpenCabinet.ts`). В файле компонента — только он сам и то, что нужно лишь ему и короче пары строк. oxlint (`react/no-multi-comp`) не пропустит второй компонент; хелперы он не видит — за ними следит ревью. Образец — `src/pages/invite/`, `src/pages/team/`.
- Env — только `VITE_*`, объявлены в `src/vite-env.d.ts`.
- Тексты — через `useTranslation()`, ключ в **обоих** `src/locales/en.json` и `ru.json` (тест сверяет наборы ключей). Язык — первый из предпочитаемых браузером, который знает приложение (`src/language.ts`), иначе английский; `<html lang>` следует за ним. Переключателя пока нет. Ключи типизированы по `en.json`: опечатка — ошибка typecheck. Сообщения валидации в zod-схемах — ключи `validation.*`, на экран их выводит `fieldErrorText`.

## API

Браузер ходит в API только на свой origin, под `/api`: бэк отклоняет изменяющие запросы с чужого origin (CSRF). Dev-сервер проксирует `/api` на бэк (`API_PROXY_TARGET` из shell или `.env.local`, по умолчанию `http://localhost:3000`) и срезает префикс; в проде то же сделает reverse proxy.

- **Без `changeOrigin` в proxy.** Он переписывает `Host`; с телефона по LAN (обычный HTTP — браузер не шлёт `Sec-Fetch-Site`) бэк сравнивает `Origin` с `Host`, и каждый POST получает 403. На localhost этого не видно.
- С телефона: `npm run dev -- --host`, в `.env` бэка `SESSION_COOKIE_SECURE=false` (иначе Secure-кука по HTTP не сохранится), открыть `http://<IP компьютера>:5173`.
- Ошибку запроса разбираем по `error.status` и `error.body` (`ApiError`); 4xx запросы не повторяют.

## PWA и экран телефона

Приложение ставится на главный экран и открывается без адресной строки (E20). Правила для каждой страницы:

- **Главное действие формы или шага — в `ActionBar` из кита**, внутри `<form>`, после полей. На мобильном панель прижата к низу, над полоской «Домой» и над экранной клавиатурой (iOS кладёт клавиатуру поверх страницы — самодельный `position: sticky; bottom: 0` уходит под клавиши). Что-то ещё прижатое к низу — через `useKeyboardInset()` из `ted-ui/hooks/useKeyboardInset`.
- **Высота — `dvh`, никогда `vh`**: `100vh` выше экрана, пока видны панели браузера, и не знает о клавиатуре. Каркас `#root` уже `min-height: 100dvh`. `scripts/viewportUnits.test.ts` падает на `vh` в `src/`.
- **Верхний край установленного приложения на iOS 26+**: `.pwa-top-edge` в `index.html` (стили в `src/styles/global.scss`) — фиксированная белая полоса 8px, без неё система размывает контент под краем. Не удалять; у страниц сверху не меньше 8px отступа, иначе полоса закроет их край. Всё, что открывается поверх (модалки, popover), — выше её `z-index: 1300`; выпадающий список `Combobox` (1100) — ниже, у самого верха экрана его край уйдёт под полосу.
- **viewport meta в `index.html` не трогать**: `viewport-fit=cover` (без него `env(safe-area-inset-*)` = 0) и `interactive-widget=resizes-content` (Chrome сжимает раскладку и `dvh` под клавиатуру). `maximum-scale` / `user-scalable=no` не добавлять — поля кита на мобильном 16px, iOS не зумит.
- **Service worker** (`vite-plugin-pwa` в `vite.config.ts`) кэширует только каркас: JS, CSS, HTML, иконки, шрифты. **`/api` не кэшируется никогда** — ответы привязаны к аккаунту. Регистрирует его `src/pwa/registerAppUpdates.ts`.
- **Обновление установленного приложения** (`src/pwa/updatePolicy.ts`): iOS и Android возвращают приложение из фона без перезагрузки, поэтому при каждом возврате на экран оно само проверяет новую версию, а переключается на неё только уходя в фон и только если ни в одной форме нет введённых данных. **Каждая форма** сообщает о них: `useUnsavedInput(form.formState.isDirty)` из `src/pwa/unsavedInput.ts` — иначе обновление может перезагрузить её с данными пользователя.
- **Иконки** — из `public/favicon.svg` (скруглённая) и `pwa/icon-full-bleed.svg` (до краёв: maskable и iOS сами режут форму); после правки источника `npm run pwa:icons`.
- **Проверка**: `npm run test:e2e` гоняет мобильный экран (`e2e/mobile.spec.ts`: 390px, клавиатура iOS подделана через `visualViewport`); `npm run build && npm run test:pwa` — manifest и работа офлайн на собранной версии (service worker есть только в сборке).

## TedUI в Vite — не «чистить»

Эти настройки выглядят лишними, но без них кит не работает:

- `vite-plugin-svgr` с `include: '**/*.svg'` и `exportType: 'default'` — кит импортирует SVG без `?react`;
- `optimizeDeps.exclude: ['ted-ui']` — пакет поставляется исходниками `.tsx`;
- `optimizeDeps.include` — все пакеты, которые импортирует кит. Без этого в dev-режиме (сборка не ловит!) CommonJS-зависимость падает в браузере с `does not provide an export named …`. При обновлении TedUI сверить список с его импортами и прогнать `npm run test:e2e`;
- `verbatimModuleSyntax: false` — tsc проверяет исходники кита, а они импортируют типы без `import type`;
- `import 'ted-ui/tokens.scss'` в `main.tsx`, ресеты в `src/styles/global.scss`, Montserrat — `@fontsource/montserrat` (500, 600, 700) в `main.tsx`, а не Google Fonts: файлы шрифта в precache, офлайн приложение не теряет шрифт;
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
npm run test:pwa
```

`npm run test:e2e` — Playwright на dev-сервере, падает на любой ошибке страницы (один раз нужен `npx playwright install chromium --only-shell`). Обязателен после изменений `vite.config.ts` и обновления TedUI: `build` проблемы dev-режима не видит.
