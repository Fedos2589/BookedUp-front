# E21 Deploy to a VPS for a test with friends — front — Implementation Plan

> **For the executor (Sonnet):** one task = one fresh session (`/clear` between tasks). Work inline,
> no subagents. Read only the files the task names plus this repo's AGENTS.md. If the task turns out bigger
> than described, stop and say so — it gets split, not pushed through. Tick the task's box when its check
> passes, commit, don't push.

**Status:** planned 2026-11-26; T1–T2 done on `e21/deploy`. Three branches: `e21/deploy` (T1–T2), `e21/password-reset`
(T3–T4), `e21/legal` (T5–T7).

**Goal (epic E21):** the front ships as a Docker image that the server's Caddy runs: the built `dist/` inside
`caddy:2-alpine`. Released by hand from `main` to GHCR.

**Common plan** (decisions D1–D19, the server, the Caddyfile, the by-hand steps R1–R16):
`~/work/BookedUp-back/docs/superpowers/plans/2026-11-26-e21-deploy.md`. Open it only if a task leaves a question
this file doesn't answer. The Caddyfile is **not** in this repo: it lives in the back's `deploy/` and is mounted
into the image (D11).

**One branch `e21/deploy` from `main`, one PR**, reviewed by Opus; it merges before the back's PR (the back's S3
checks against a local image from T1).

## Global constraints

- Nothing in `src/` or `vite.config.ts` changes. The app already calls the API at `/api` (Orval `baseUrl`), the
  same origin in production (D2).
- Image: `ghcr.io/fedos2589/bookedup-web:<full sha>`, `linux/amd64`.
- Sentry and PostHog stay off: the image is built without `VITE_SENTRY_DSN` / `VITE_POSTHOG_KEY` (D21 of the common
  plan). Declare them as `ARG`s so turning them on later is a workflow change, not a Dockerfile one.
- Commit messages via `git commit -F - <<'EOF'`.

## Review focus

1. `dist/` in the image has `sw.js`, `workbox-*.js`, `push-sw.js`, `manifest.webmanifest` — the PWA breaks
   silently without them.
2. `node_modules`, `.env*`, `dist` and test output of the laptop never reach the build context (`.dockerignore`).
3. The Release workflow refuses any ref but `main`.

---

### - [x] T1: the web image

**Files:** create `Dockerfile`, `.dockerignore`.

- Build stage pinned to an exact `node:22.<x>.<y>-alpine` that satisfies `engines` ≥ 22.22.1 (check with
  `docker run --rm node:<tag> node -v`): `apk add --no-cache git` (TedUI is a
  `github:` dependency — drop it if `npm ci` works without git), `COPY package.json package-lock.json`, `npm ci`,
  `COPY . .`, `ARG VITE_SENTRY_DSN` `ARG VITE_POSTHOG_KEY` (empty by default), `npm run build`.
- Final stage pinned `caddy:2.<minor>-alpine` (the current one): `COPY --from=build /app/dist /srv`. No Caddyfile of
  its own (the server mounts the back's one). Note: the image's default Caddyfile serves `/usr/share/caddy`, not
  `/srv` — so a bare `docker run` of the image shows Caddy's welcome page; the check below runs `caddy file-server`.
- `.dockerignore`: `node_modules`, `dist`, `.git`, `.github`, `docs`, `e2e`, `e2e-pwa`, `playwright-report`,
  `test-results`, `.env*`, `*.log`.

**Check:**

```bash
docker build -t bookedup-web:local .
docker run --rm --entrypoint ls bookedup-web:local /srv /srv/assets | head -30
#   index.html, sw.js, workbox-*.js, push-sw.js, manifest.webmanifest, pwa-*.png, assets/…
docker run --rm -d --name t1web -p 8080:80 bookedup-web:local caddy file-server --root /srv --listen :80 && sleep 2
curl -s localhost:8080/ | grep -c '<div id="root">'     # 1
docker rm -f t1web
```

Keep `bookedup-web:local`: the back's S3 uses it. Commit `build(docker): the web image`.

### - [x] T2: Release workflow and a pointer

**Depends on:** T1. **Files:** create `.github/workflows/release.yml`; `AGENTS.md` (one line); this file (status, ticks).

- `on: workflow_dispatch`; job `if: github.ref == 'refs/heads/main'`; `permissions: contents: read, packages: write`.
- `actions/checkout@v5`, `docker/setup-buildx-action`, `docker/login-action` (`ghcr.io`, `${{ github.actor }}`,
  `${{ secrets.GITHUB_TOKEN }}`), `docker/build-push-action` — each pinned `@v<current major>` —: `platforms:
linux/amd64`, `push: true`,
  `tags: ghcr.io/fedos2589/bookedup-web:${{ github.sha }}`, `cache-from/to: type=gha`. Last step writes the tag to
  `$GITHUB_STEP_SUMMARY`.
- `AGENTS.md`: «Deploy: the image is built by the Release workflow (by hand, from `main`); the server, Caddy and the
  deploy command are in the back's `docs/deploy.md`.»

**Check:** `actionlint .github/workflows/release.yml` passes (if not installed: `brew install actionlint`, or say so);
`npm run format:check`. The real run is R2 of the common plan, after merge. Commit `ci: release workflow pushes the web image to GHCR`.

---

## P1. Password reset (branch `e21/password-reset`, after the back's S13–S14 are merged)

Decisions D24–D30 and the back's routes are in the common plan («P1»). What the back gives:

- `POST /auth/password-reset` `{ email }` → 204 always (also for an unknown email); 400; 429.
- `POST /auth/password-reset/confirm` `{ token, password }` → 204; 404 `{ code: 'resetLinkInvalid' }` (unknown,
  expired or used — one answer); 400; 429. All sessions of that user end; no sign-in happens.
- The letter's link: `/reset-password/<token>`, token = 43 chars `[A-Za-z0-9_-]`.

Regenerate with `npm run api:generate` (the back running on its P1 branch).

### - [ ] T3: «Forgot password?» and the request page

**Files:** `src/app/router.tsx`, `src/pages/auth/SignInPage.tsx`, create `src/pages/auth/ForgotPasswordPage.tsx`,
`src/pages/auth/forgotPassword.test.tsx`, `src/locales/en.json`, `src/locales/ru.json`, `src/api/` (generated).

- Sign-in: a link «Forgot password?» under the password field → `/forgot-password`, carrying the typed email as
  `?email=` (validated like `invitationTokenOf`: a string ≤ 254 — the back's `emailSchema` limit — else dropped).
- `/forgot-password` (`redirectIfSignedIn`, lazy, `AuthLayout`): one email field (the sign-in's schema), «Send link».
  After 204 the form is replaced by «If an account with <email> exists, we sent a link to it. It works for one hour.
  No letter? Check spam, or try again in a minute» with «Send again» (same email) and «Back to sign-in». The back
  answers 204 and sends nothing to a repeat request inside one minute (D25), and a failed send is also a 204 — so
  «Send again» is disabled for 60 s after each send (a visible countdown), not clickable into silence. 429 →
  `auth.tooManyAttempts`; anything else → `auth.failed`. `useUnsavedInput` as the sign-in.

**Check:** `forgotPassword.test.tsx` with `fakeApi` — the link on sign-in carries the email; submit posts
`{ email }`, shows the sent screen with the address and «Send again» disabled until 60 s pass (fake timers); 429 shows the limit text; an invalid email doesn't post. `npm run
typecheck && npm run lint && npm test`. Commit `feat(auth): ask for a password reset link`.

### - [ ] T4: the new-password page

**Files:** `src/app/router.tsx`, create `src/pages/auth/ResetPasswordPage.tsx`, `src/pages/auth/resetToken.ts`,
`src/pages/auth/resetPassword.test.tsx`; `src/pages/auth/SignInPage.tsx`, `src/locales/en.json`, `src/locales/ru.json`.

- `/reset-password/$token`: `resetToken.ts` parses the param like `invitationTokenOf` (43 chars `[A-Za-z0-9_-]`, else
  undefined → the «link is not valid» screen straight away). Not behind `redirectIfSignedIn`: a signed-in user may
  reset too.
- One `PasswordInput` «New password» (`autoComplete="new-password"`, min 8 — the sign-up's rule and message), «Save».
  204 → clear the cached `GET /me` (the sessions ended) and go to `/sign-in?reset=1`; the sign-in page then shows
  «Password changed. Sign in with the new one». 404 → «The link expired or was already used» with a link to
  `/forgot-password`; 429 / other as T3.

**Check:** `resetPassword.test.tsx` — a bad token shape shows the invalid screen without a request; submit posts
`{ token, password }`; 204 lands on sign-in with the notice; 404 shows the expired screen with the link; a 7-char
password doesn't post. `npm run typecheck && npm run lint && npm test && npm run build && npm run check:chunks`.
Tick T3–T4 here. Commit `feat(auth): set a new password from the link`.

---

## P2. Terms of use and privacy policy (branch `e21/legal`)

Decisions D31–D35, the outline of both texts and the review focus are in the common plan («P2») — the executor of
T5 and T6 reads that section whole. Needs R19 (the IE's details) before T5.

### - [ ] T5: legal pages and the privacy policy

**Files:** `src/app/router.tsx`, create `src/pages/legal/LegalPage.tsx`, `src/pages/legal/LegalPage.module.scss`,
`src/pages/legal/legalEntity.ts`, `src/pages/legal/PrivacyPage.tsx`, `src/pages/legal/PrivacyEn.tsx`,
`src/pages/legal/PrivacyRu.tsx`, `src/pages/legal/legal.test.tsx`; `src/locales/en.json`, `src/locales/ru.json`
(only the page titles and «Last updated»).

- `legalEntity.ts`: `{ name, registrationNumber, address, privacyEmail, contactEmail, updated }` (D32, values from R19
  and R17; `updated` = the date the text was last changed, ISO).
- `LegalPage`: a readable column (max ~70ch, centered as the project's pages), the title, «Last updated <date>»
  (through `src/dates.ts`'s Intl formatting), the body. `PrivacyPage` picks `PrivacyRu` for `ru`, else `PrivacyEn`.
- `/privacy`: public (no `requireAccount`), lazy. The texts follow the common plan's outline, section by section,
  nothing added (D34).

**Check:** `legal.test.tsx` — `/privacy` renders without a session in en and in ru (switching the language switches
the text), shows the IE's name and `privacyEmail` from `legalEntity`. `npm run typecheck && npm run lint && npm test
&& npm run build && npm run check:chunks`. Commit `feat(legal): privacy policy`.

### - [ ] T6: the terms of use

**Files:** `src/app/router.tsx`, create `src/pages/legal/TermsPage.tsx`, `src/pages/legal/TermsEn.tsx`,
`src/pages/legal/TermsRu.tsx`; `src/pages/legal/legal.test.tsx`, `src/locales/en.json`, `src/locales/ru.json`.

`/terms` as `/privacy` (T5), the text from the outline. **Check:** the T5 test extended to `/terms`; the same
commands. Commit `feat(legal): terms of use`.

### - [ ] T7: links and consent wording

**Files:** `src/pages/auth/AuthLayout.tsx` (+ its `.module.scss`), `src/pages/signUp/SignUpPage.tsx`,
`src/pages/invite/SignUpToJoin.tsx`, `src/pages/book/ContactsStep.tsx`, `src/pages/settings/SettingsPage.tsx`,
`src/locales/en.json`, `src/locales/ru.json`, tests next to each (`signUp.test.tsx`, `invite.test.tsx`,
`booking.test.tsx`, `settings.test.tsx`).

- `AuthLayout`: a quiet footer «Terms · Privacy» (sign-in, sign-up, forgot and reset pages get it).
- Under the sign-up button (owner's sign-up and the invitation's): «By signing up you accept the Terms of use and the
  Privacy policy» — links inside the sentence with `Trans` (see `src/pages/clients/ClientPage.tsx`).
- Booking contacts step, under the form: «Your name and phone go to <business> and to BookedUp to make and remind
  about this booking. Privacy policy». The business name is already on the page.
- Settings page, at the bottom: links to both pages.
- Links are plain `<Link>`s to lazy routes: `/book` must not start loading the legal pages (`check:chunks`).

**Check:** each test finds the links with the right `href`; `npm run typecheck && npm run lint && npm test && npm run
build && npm run check:chunks && npm run test:e2e`. Tick T5–T7 here. Commit `feat(legal): links to the terms and the
privacy policy`.

## Tasks

| #   | What                                              | Depends on |
| --- | ------------------------------------------------- | ---------- |
| T1  | Web image: Caddy + `dist`                         | —          |
| T2  | Release workflow → GHCR `bookedup-web`, AGENTS.md | T1         |
| T3  | P1: «Forgot password?», request page              | back S13   |
| T4  | P1: new-password page                             | T3, S14    |
| T5  | P2: legal pages, privacy policy                   | R19, R17   |
| T6  | P2: terms of use                                  | T5         |
| T7  | P2: links and consent wording                     | T6         |
