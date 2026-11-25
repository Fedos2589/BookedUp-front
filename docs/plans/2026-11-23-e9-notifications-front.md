# E9 notifications and reminders — front — Implementation Plan

> **For the executor (Sonnet):** one task = one fresh session (`/clear` between tasks). Work inline,
> no subagents. Read only the files the task names plus this repo's AGENTS.md (and the skills it
> points to). If the task turns out bigger than described, stop and say so — it gets split, not
> pushed through. Tick the task's box when its check passes, commit, don't push.
>
> **When the step is merged:** its last task updates the step's row in the common plan (another repo —
> its own branch from `main` and its own commit; don't push).

**Goal (epic E9):** the client turns on reminders for their booking in the channels they use —
Telegram, WhatsApp, push, email — on the done screen and on the manage page. A member of the staff
picks their own channels in the cabinet, and an owner / admin sets the business's reminder times.

**Common plan** (why each decision was made, «D1»…«D11», the back's steps):
`~/work/BookedUp-back/docs/superpowers/plans/2026-11-23-e9-notifications.md`. Open it only if a task
leaves a question this file doesn't answer.

**Before this step:** the back's steps N and M are merged in BookedUp-back `main`, and E7's front
G4–G5 (`DoneStep`, `ManagePage`) are merged here. One branch `e9/notifications`, one PR, reviewed by
Opus before merge. No kit task: `Button`, `Checkbox`, `Input`, `PhoneNumberField`, `ConfirmDialog`,
`Toast` cover it.

## What the back gives

Regenerate the client with `npm run api:generate`.

- `GET /public/businesses/:slug` → adds `channels: { telegram, whatsapp, push, email }` (which are
  on) and `pushKey: string | null`.
- `GET /public/bookings/:token` → adds `notifications: { telegram: boolean, whatsapp: boolean, push:
string[] (endpoints), email: string | null (masked) }` — for this booking; WhatsApp is the client
  card's, so it is on for their other bookings too.
- Client, by the manage token: `POST …/:token/telegram-link { locale }` → `{ url }` (t.me deep link, 1 h);
  `PUT|DELETE …/:token/whatsapp { locale }`; `PUT …/:token/push { subscription, locale }`, `DELETE
{ endpoint }`; `PUT …/:token/email { email, locale }`, `DELETE`. A channel that's off → 404
  `channelOff`; a booking that can't change any more → 409.
- Staff, the account's: `GET /me/notifications` → `{ available: { telegram, push, email },
pushKey, email: boolean, telegram: boolean, push: string[] }`; `PUT /me/notifications { email }`;
  `POST /me/telegram-link` → `{ url }`; `DELETE /me/notifications/telegram`; `PUT
/me/notifications/push { subscription }`, `DELETE { endpoint }`. **No WhatsApp for a member** (review of
  back #51): WhatsApp sends client templates only, so the route is gone until there is a staff template.
  A push endpoint belongs to the account that subscribed last (the back drops the others' rows of it).
- Per business: `GET|PUT /businesses/:id/me/notifications { allOnline: boolean | null }` (`null` for a
  master — don't show it); `GET /businesses/:id` → `reminderOffsets: number[]`; `PUT
/businesses/:id/reminders { offsets }` — owner / admin, 0–3 of 60, 120, 180, 1440, 2880.
- The first message after a client turns a channel on carries the manage link; reminders don't.

## Decisions for the screens

- **One block, two screens:** `NotifyMe` — «Get a reminder» with a row per channel the business has
  on. Off: a button («Telegram», «WhatsApp to +7 …», «Notifications on this device», «Email» which opens
  an email field). On: «On» and a «Turn off» link. Used on the done screen and the manage page.
- **Telegram** opens the deep link in a new tab (`window.open`, or a plain `<a target=_blank>` after
  the URL arrives — whichever doesn't get blocked on iOS Safari: test it by hand) and refetches the
  booking when the page becomes visible again.
- **Push** is shown only when the browser can (`'PushManager' in window` and a service worker). On iOS
  Safari outside the installed app it shows «Add this page to your home screen to get notifications»
  instead of the button (iOS gives push to installed web apps only).
- **Language** sent with every turn-on: the app's current i18n language (`en`/`ru`).
- **Cabinet:** a «Notifications» section in Settings, for every member: email switch, Telegram
  connect / disconnect, push on this device; «All online bookings» for owner / admin. No WhatsApp here.
- **Signing out** turns this device's push off first: `DELETE /me/notifications/push { endpoint }` with the
  endpoint of the browser's own subscription, before the session ends; a failure doesn't stop signing out.
  Otherwise the next person on a shared computer would hear the previous account's bookings until they
  subscribe themselves.
  Under it, for owner / admin, «Reminders to clients»: 5 checkboxes (1 h, 2 h, 3 h, 24 h, 48 h), at most
  3, saved with a button.

## Global constraints

- AGENTS.md rules (kit first, one component per file, `useUnsavedInput` on every form, i18n en + ru).
- Generated API only, no hand-written fetch.
- MSW in component tests; no real push or Telegram in tests — the push helper is mocked at its module.
- Checks before a commit: `npm run typecheck && npm run lint && npm test`.

## Review focus

1. A client sees and turns off only this booking's channels; WhatsApp says it covers their bookings of
   this business.
2. The push button never appears where push can't work, and a denied permission leaves a clear text,
   not a dead button.
3. The cabinet's push row tells «this device» apart from the member's other devices (by endpoint).
4. The reminder times form can't send more than 3 and is hidden from a master.

---

### - [x] F1: API and push in the service worker

**Files:** `src/api/*` (regenerated), `vite.config.ts`, create `public/push-sw.js`, create
`src/pwa/{push.ts,push.test.ts}`.

`npm run api:generate`. The service worker stays generated by Workbox; add `importScripts:
['push-sw.js']` to `workbox` in `vite.config.ts`. `push-sw.js`: on `push` → `showNotification(title,
{ body, data: { url } })`; on `notificationclick` → focus a tab with that URL or open it. `push.ts`:
`pushSupport(): 'yes' | 'installFirst' | 'no'` (iOS without `navigator.standalone` /
`display-mode: standalone` → `installFirst`), `subscribe(pushKey) → PushSubscriptionJSON` (asks
permission; `denied` → throws a typed error), `currentEndpoint(): Promise<string | null>`,
`unsubscribe()`.

**Check:** `push.test.ts` — support on a faked iOS / Android / no PushManager; `subscribe` passes the
key as a `Uint8Array`; denied → the typed error. `npm run test:pwa` green and the built `sw.js` contains
`importScripts("push-sw.js")`. Commit `feat(pwa): push in the service worker`.

### - [x] F2: `NotifyMe` — Telegram and WhatsApp

**Files:** create `src/pages/book/notify/{NotifyMe.tsx,NotifyMe.module.scss,ChannelRow.tsx,notifyMe.test.tsx}`,
locales.

Props: `slug`, `token`, `channels` (the business's), `notifications` (the booking's), `phone` (masked
for the WhatsApp label). Rows for Telegram and WhatsApp only in this task (F3 adds push and email):
Telegram → POST link → open; WhatsApp → PUT; «Turn off» → DELETE; each invalidates the booking query.
409 → «This booking can't change any more»; 404 `channelOff` → the row disappears (refetch the
business).

**Check:** `notifyMe.test.tsx` with MSW — only the business's channels are shown; WhatsApp on → «On»;
turn off → back to the button; Telegram calls `window.open` with the URL; 409 text shown. Commit
`feat(book): reminders in Telegram and WhatsApp`.

### - [x] F3: `NotifyMe` — push and email

**Files:** `src/pages/book/notify/{NotifyMe.tsx,notifyMe.test.tsx}`, create
`src/pages/book/notify/{PushRow.tsx,EmailRow.tsx}`, locales.

Push row: `pushSupport()` → button / «Add to the home screen first» / nothing; on → `subscribe` → PUT;
«On» when `currentEndpoint()` is in `notifications.push`; off → DELETE + `unsubscribe`; denied →
«Notifications are blocked in the browser settings». Email row: a button that reveals a kit `Input`
(type email) + «Save»; on → shows the masked address + «Turn off»; 400 → field error. Uses
`useUnsavedInput` while the field is dirty.

**Check:** tests with `push.ts` mocked — each support state; on / off; denied text; email saved shows the
masked address; 400 shows the error. Commit `feat(book): reminders by push and email`.

### - [x] F4: on the done screen and the manage page

**Files:** `src/pages/book/{DoneStep.tsx,ManagePage.tsx}`, their tests, locales.

`DoneStep`: under the link, `NotifyMe` (the token is the last segment of `manageLink`; the booking's
`notifications` start all off — no fetch until the first turn-on). `NotifyMe` re-asks the booking after every turn-on, so
`DoneStep` must hold that query in the cache (`useQuery` with `getPublicBookingControllerManagedQueryOptions`,
`enabled` after the first turn-on), or the row never switches to «On». `ManagePage`: `NotifyMe` while
`canChange`; hidden once the booking has started or was cancelled.

**Check:** the booking test reaches step 4 and turns on WhatsApp; the manage test shows the block and
hides it for a cancelled booking. Commit `feat(book): get reminders after booking`.

### - [x] F5: my notifications in the cabinet

> **Done differently:** a master can't open Settings (`viewSettings`), so the section is its own page
> `/notifications` for every role (`src/pages/notifications/`, a link in the cabinet nav), not a part of
> `SettingsPage`. F6's reminder times stay in Settings.

**Files:** create `src/pages/settings/notifications/{MyNotifications.tsx,MyNotifications.module.scss,myNotifications.test.tsx}`,
`src/pages/settings/SettingsPage.tsx`, `src/app/SignOut.tsx` (+ its test), locales.

A section «Notifications» for every member, from `GET /me/notifications` and
`GET /businesses/:id/me/notifications`: email `Checkbox` (saves at once); Telegram «Connect» → POST link
→ open, refetch on visible / «Connected · Disconnect»; push: «Turn on for this device» (same `push.ts`, `pushSupport`, the
cabinet's `pushKey`) / «On for this device · Turn off», and «also on N other devices» when other
endpoints exist; owner / admin: «All online bookings of this business» `Checkbox`. A channel the back
doesn't have on is not shown. `SignOut` first calls `DELETE /me/notifications/push` with this browser's
own endpoint (when it has a subscription), then signs out; the call's failure is ignored.

**Check:** `myNotifications.test.tsx` — a master sees no «all online»; Telegram connect opens the URL;
no WhatsApp row; push on for this device vs another; sign-out sends the DELETE with the device's endpoint
first, and still signs out when it fails; email unchecked sends `{ email:
false }`. Commit `feat(settings): my notifications`.

### - [x] F6: reminder times

**Files:** create `src/pages/settings/ReminderTimes.tsx` (+ test), `src/pages/settings/SettingsPage.tsx`,
locales.

Owner / admin only: «Reminders to clients» — 5 `Checkbox`es (1 h, 2 h, 3 h, 24 h, 48 h) from
`reminderOffsets`; the unchecked ones disabled once 3 are checked, with a hint «up to 3»; none =
«Clients get no reminders»; Save → `PUT /reminders` → toast; `useUnsavedInput` while changed.

**Check:** test — a master doesn't see it; a 4th box is disabled; save sends sorted offsets; empty is
allowed and shows the text. Commit `feat(settings): reminder times`.

### - [ ] F7: e2e, test plan, close the step

**Files:** create `e2e/notifications.spec.ts`, `docs/manual-test-plan.html`, then the common plan in
BookedUp-back.

E2e against the back with the log channel (as `book.spec.ts`): book, turn on email on the done screen,
see «On»; in the cabinet set reminder times and turn email off. Manual test plan: a real bot (Telegram
on a phone: deep link → «connected» → confirmation with the link), push on Android Chrome and on an
installed iOS page, WhatsApp to a test number, email via Resend; move a booking → reminder at the new
time; cancel → none; a master's own change → no message. Update the TOC, counts and hashes; republish
the artifact. After the merge: row F in the common plan → «done — PR #N», on a branch
`docs/e9-front-done` from BookedUp-back `main`.

**Check:** `npm run test:e2e` green. Commit `test(notifications): e2e and manual scenarios`.
