---
name: front-vite-ted-ui
description: Используй при правке vite.config.ts, tsconfig, main.tsx или при обновлении TedUI: настройки Vite, которые выглядят лишними, но без которых кит не работает.
---

# TedUI в Vite — не «чистить»

Часть правил из `AGENTS.md`, вынесена в скилл, чтобы читаться только когда работа её касается.

Эти настройки выглядят лишними, но без них кит не работает:

- `vite-plugin-svgr` с `include: '**/*.svg'` и `exportType: 'default'` — кит импортирует SVG без `?react`;
- `optimizeDeps.exclude: ['ted-ui']` — пакет поставляется исходниками `.tsx`;
- `optimizeDeps.include` — все пакеты, которые импортирует кит. Без этого в dev-режиме (сборка не ловит!) CommonJS-зависимость падает в браузере с `does not provide an export named …`. При обновлении TedUI сверить список с его импортами и прогнать `npm run test:e2e`;
- `verbatimModuleSyntax: false` — tsc проверяет исходники кита, а они импортируют типы без `import type`;
- `import 'ted-ui/tokens.scss'` в `main.tsx`, ресеты в `src/styles/global.scss`, Montserrat — `@fontsource/montserrat` (500, 600, 700) в `main.tsx`, а не Google Fonts: файлы шрифта в precache, офлайн приложение не теряет шрифт;
- `registerUIKitTranslations(i18n)` в `src/i18n.ts`.

Кит ставится по тегу (`github:Fedos2589/TedUI#vX.Y.Z`); `node_modules/ted-ui` не редактировать.
