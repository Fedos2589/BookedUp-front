---
name: front-api
description: Используй при работе с запросами к бэку: dev-proxy на /api, CSRF и Host, проверка с телефона по LAN, разбор ApiError.
---

# API и proxy

Часть правил из `AGENTS.md`, вынесена в скилл, чтобы читаться только когда работа её касается.

Браузер ходит в API только на свой origin, под `/api`: бэк отклоняет изменяющие запросы с чужого origin (CSRF). Dev-сервер проксирует `/api` на бэк (`API_PROXY_TARGET` из shell или `.env.local`, по умолчанию `http://localhost:3000`) и срезает префикс; в проде то же сделает reverse proxy.

- **Без `changeOrigin` в proxy.** Он переписывает `Host`; с телефона по LAN (обычный HTTP — браузер не шлёт `Sec-Fetch-Site`) бэк сравнивает `Origin` с `Host`, и каждый POST получает 403. На localhost этого не видно.
- С телефона: `npm run dev -- --host`, в `.env` бэка `SESSION_COOKIE_SECURE=false` (иначе Secure-кука по HTTP не сохранится), открыть `http://<IP компьютера>:5173`.
- Ошибку запроса разбираем по `error.status` и `error.body` (`ApiError`); 4xx запросы не повторяют.
