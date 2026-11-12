# BookedUp — front

SPA на React + TypeScript + Vite. Бэк — репозиторий BookedUp-back (NestJS), связь через его Swagger.

@node_modules/ted-ui/docs/agents/usage.md

Подробные правила по темам — в скиллах `.claude/skills/`; прочитайте нужный до начала работы:

| Когда вы…                                                            | Читайте                                                                                  |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| добавляете страницу кабинета, трогаете роли, команду, текущий бизнес | [`.claude/skills/front-cabinet/SKILL.md`](.claude/skills/front-cabinet/SKILL.md)         |
| меняете запросы к API, proxy, проверяете с телефона                  | [`.claude/skills/front-api/SKILL.md`](.claude/skills/front-api/SKILL.md)                 |
| делаете форму, нижнюю панель, мобильный экран, PWA                   | [`.claude/skills/front-pwa/SKILL.md`](.claude/skills/front-pwa/SKILL.md)                 |
| правите `vite.config.ts` или обновляете TedUI                        | [`.claude/skills/front-vite-ted-ui/SKILL.md`](.claude/skills/front-vite-ted-ui/SKILL.md) |

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
- Кабинет, текущий бизнес, роли, «Команда» — скилл `front-cabinet`.
- `src/dates.ts` — dayjs с utc/timezone; всё время на экране — через него и в часовом поясе бизнеса (`timeIn(момент, business.timeZone)`).
- `src/test/` — `renderApp(path)` (всё приложение на memory history со своим кэшем) и `fakeApi` (подменяет fetch ответами по маршрутам и записывает запросы).

## Правила

- Интерфейс — из TedUI (правила выше, в `usage.md`). Не хватает компонента или вида — это изменение в ките, не локальная копия и не переопределение стилей.
- Данные с сервера — только через сгенерированные хуки TanStack Query. Zustand — для состояния клиента (UI, черновики), не кэш серверных данных.
- React 19+ (сейчас 19.3): если задача упирается ровно в ту проблему, которую решает новая возможность React, — берите её, а не самописный обходной путь. Без рефакторинга ради рефакторинга и без внедрения «везде». Примеры: `useOptimistic` — мгновенный отклик на действие до ответа сервера (не дублируя то, что уже делает `onMutate` TanStack Query); `<Activity mode="hidden">` — скрыть экран или вкладку, сохранив их состояние, вместо условного рендера с потерей ввода; Actions / `useActionState` / `useFormStatus` — простая форма без валидации по полям (формы с полями по-прежнему react-hook-form + zod); `use()` — прочитать контекст или промис условно; `useEffectEvent` — обработчик внутри эффекта без лишних зависимостей; `ref` как обычный проп вместо `forwardRef`. React Compiler пока не подключён: включать отдельной задачей (правка `vite.config.ts` — скилл `front-vite-ted-ui`, затем `npm run test:e2e`), после чего ручные `useMemo`/`useCallback`/`memo` в новом коде не нужны.
- Формы — react-hook-form + zod; схема валидации рядом с формой.
- Даты — dayjs с utc/timezone, всё через `src/dates.ts`. С бэка время приходит в UTC, показывается в часовом поясе бизнеса, а не браузера. Исключение — дата с названием месяца: `dateTimeIn` форматирует её через Intl на языке приложения (у dayjs для этого пришлось бы грузить локали).
- Импорты из другой папки `src/` — через `@/` (`import { currentBusinessOf } from '@/business/currentBusiness'`), не относительно; `./` — только файлы своей же папки (стили страницы, соседний модуль), не подпапки. `@/` = `src/` описан в одном месте — `paths` в `tsconfig.app.json`; Vite берёт его оттуда (`resolve.tsconfigPaths`). oxlint (`no-restricted-imports`, только в `src/`) запрещает `..`, `../…` и `./папка/…`. В `e2e/` и `scripts/` `@/` нет. Сгенерированный `src/api/` не трогаем: его импорты пишет Orval.
- **Один компонент — один файл**, файл назван по компоненту (`AcceptInvitation.tsx`). Страница — папка в `src/pages/`: в главном файле только сама страница, её части (форма, диалог, секция, экран ошибки) — соседние файлы. Хелперы туда же, отдельными модулями: чистые функции (`joinErrors.ts`, `inviteText.ts`), схема формы (`joinForm.ts`), хуки (`useOpenCabinet.ts`). В файле компонента — только он сам и то, что нужно лишь ему и короче пары строк. oxlint (`react/no-multi-comp`) не пропустит второй компонент; хелперы он не видит — за ними следит ревью. Образец — `src/pages/invite/`, `src/pages/team/`.
- Env — только `VITE_*`, объявлены в `src/vite-env.d.ts`.
- Тексты — через `useTranslation()`, ключ в **обоих** `src/locales/en.json` и `ru.json` (тест сверяет наборы ключей). Язык — первый из предпочитаемых браузером, который знает приложение (`src/language.ts`), иначе английский; `<html lang>` следует за ним. Переключателя пока нет. Ключи типизированы по `en.json`: опечатка — ошибка typecheck. Сообщения валидации в zod-схемах — ключи `validation.*`, на экран их выводит `fieldErrorText`.

## API

Браузер ходит в API только на свой origin, под `/api`; dev-proxy без `changeOrigin`; ошибки — `ApiError`. Подробности — скилл `front-api`.

## PWA и экран телефона

Главное действие формы — `ActionBar` из кита; высота — `dvh`, никогда `vh`; viewport meta не трогать; `/api` не кэшируется; каждая форма сообщает о несохранённом вводе (`useUnsavedInput`). Подробности — скилл `front-pwa`.

## TedUI в Vite

Настройки Vite для кита выглядят лишними, но нужны; `node_modules/ted-ui` не редактировать. Перед правкой `vite.config.ts` и при обновлении кита — скилл `front-vite-ted-ui`.

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
