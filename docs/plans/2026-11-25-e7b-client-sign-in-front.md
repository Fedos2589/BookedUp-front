# E7b client sign-in by phone, through Telegram — front — Implementation Plan

> **For the executor (Sonnet):** one task = one fresh session (`/clear` between tasks). Work inline,
> no subagents. Read only the files the task names plus this repo's AGENTS.md (and the skills it
> points to). If the task turns out bigger than described, stop and say so — it gets split, not
> pushed through. Tick the task's box when its check passes, commit, don't push.
>
> **When the step is merged:** its last task updates the step's row in the common plan (another repo —
> its own branch from `main` and its own commit; don't push).

**Status:** not started — waits for the back's step S (BookedUp-back
`docs/superpowers/plans/2026-11-25-e7b-client-sign-in-back.md`) to be merged.

**Goal (epic E7b):** on `/book/<slug>` the client confirms their phone through the Telegram bot at the last
step, then books; while the cookie lives the page knows them: the phone is filled in, and step 1 lists
their bookings to come, each to cancel or move. Nothing about bookings is kept in `localStorage` any more.

**Common plan** (why, decisions D1–D6, D7–D9 of the split):
`~/work/BookedUp-back/docs/superpowers/plans/2026-11-23-e7b-client-sign-in.md`. Open it only if a task
leaves a question this file doesn't answer.

**One branch `e7b/client-sign-in` from `main`, one PR**, reviewed by Opus before merge. No kit step:
the waiting screen is `Typography` + `Button` + a link, the list is the existing booking-card look.

## What the back gives

All under `/public/…`; the client's cookie is `HttpOnly` — the front never sees it, it only asks.
Regenerate with `npm run api:generate` (the back running on its `main` with S merged).

- `GET /public/businesses/:slug` gains `clientSignIn: boolean` — false: Telegram is off on this server,
  nobody can book online (D7).
- `POST /public/client-login` `{ locale }` → 201 `{ url }` (`t.me/<bot>?start=…`), 404 `channelOff`, 429.
- `GET /public/client-login` → `{ status: 'pending' | 'confirmed' | 'expired' }`; `confirmed` also sets the
  session cookie. Poll it; a login lives 10 minutes.
- `GET /public/client-session` → `{ phone: string | null }`; `DELETE /public/client-session` → 204.
- `POST /public/businesses/:slug/bookings` — `phone` is gone from the body, `locale` is new (optional);
  without a session → 401 `{ code: 'clientSignIn' }`; the 201 result gains `phone` (the booked one).
- `GET /public/businesses/:slug/my-bookings` → `{ bookings: { id, clientName, staffId, staffName,
startsAt, endsAt, title, status, groupId, oneOffSessionId, canChange }[] }`; 401 without a session.
- `POST /public/businesses/:slug/my-bookings/:id/cancel`, `PATCH /public/businesses/:slug/my-bookings/:id`
  (`moveInput`) → the item; 404 not theirs, 409 as the token routes.
- `DELETE /public/bookings/:token/telegram` → 204: the client's Telegram off (booking and card).
- The manage link (`/book/<slug>/manage/<token>`) works exactly as in E7a.

## Decisions for the screens

- **The phone comes from Telegram, not from a field** (D5, simplified while splitting — check in the PR):
  without a session the contacts step asks name and note only, and its button is «Confirm phone in
  Telegram». With a session the phone is shown as text with «Not your number?» (signs out). So nobody
  types a phone that Telegram then overrides; the done screen still says which phone was booked.
- **Waiting for the bot:** after `POST client-login` the step shows «Open Telegram» as a link (a tap, not
  `window.open` after the answer — iOS blocks it, as in `NotifyMe.tsx`) and «Waiting for confirmation…»;
  it polls `GET client-login` every 2 s while the page is visible and once more when it becomes visible
  again. `confirmed` → refetch the session, the step shows the phone and «Book». `expired` → «The link
  expired» and «Try again».
- **401 from a `/public/` route is not the cabinet's session ending:** `src/app/createApp.ts` must not
  wipe the cache and go to `/sign-in` for it (a signed-in owner may open their own `/book` page).
- **Step 1 with a session:** «My bookings» above the masters, replacing E7a's saved booking; tapping one
  opens `/book/<slug>/my/<id>` with Cancel and Move (the manage page's components).
- **`clientSignIn: false`:** step 1 shows «Online booking isn't available — call the business» instead of
  the masters.

## Global constraints

- AGENTS.md and its skills rule; every user-visible string in `src/locales/{ru,en}.json`
  (`locales.test.ts` checks both). Kit components only — no restyling of kit internals.
- Nothing from the cabinet in `src/pages/book/**`; `npm run check:chunks` stays green.
- Every form calls `useUnsavedInput` (PWA update policy).
- Tests with `renderApp` + `fakeApi` (`src/test/`); fake timers for polling.
- Checks before a commit: `npm run typecheck && npm run lint && npm test`; e2e where the task says.

## Review focus (for the Opus review of the PR)

1. No phone is sent in the booking body; no booking data in `localStorage` (the E7a key is gone).
2. Polling stops on `confirmed`, `expired`, leaving the step, and while the page is hidden.
3. A 401 on `/public/…` never signs a cabinet user out; a 401 `clientSignIn` on booking goes back to
   the confirmation instead of an error.
4. The public page's first load still fetches no cabinet chunk (`check:chunks`).

---

### - [x] T1: the new client, and 401 on public routes

**Files:** `src/api/**` (generated), `src/app/createApp.ts` (+ its test), whatever fails typecheck after
generation (expect `src/pages/book/contactsForm.ts`: drop `phone` from `bookBody` for now, the form
change is T3).

`npm run api:generate`. In `createApp.ts` the «401 → forget and sign in» rule skips requests whose URL
starts with `/api/public/` (find how the query's URL / error is known there; if it is not, mark the
public queries' 401 as expected another way and say which).

**Check:** typecheck and tests green; a new test — signed-in cabinet cache, a public query answers 401 →
no redirect, cache kept. Commit `chore(api): client sign-in routes`.

### - [x] T2: confirm the phone

**Files:** create `src/pages/book/useClientSession.ts`, `src/pages/book/ConfirmPhone.tsx`,
`src/pages/book/confirmPhone.test.tsx`; `src/locales/{en,ru}.json`.

- `useClientSession()` — the generated `GET /public/client-session` query; returns `{ phone, isLoading,
signOut }` (`signOut` = `DELETE` then refetch). Loading only until the first answer (AGENTS.md rule).
- `<ConfirmPhone onConfirmed />` — the waiting flow from «Decisions for the screens». `locale` = the
  app's language. `channelOff` 404 → the D7 text. 429 → «Too many tries, wait a bit».
- Polling: the generated query with `refetchInterval: 2000` while `status === 'pending'` and
  `document.visibilityState === 'visible'`; `refetchOnWindowFocus` on. Stops otherwise.

**Check:** test with fake timers — the link is shown with the url; pending → pending → confirmed calls
`onConfirmed` and stops polling; hidden page → no requests; expired → «Try again» starts a new login.
Commit `feat(book): confirm the phone in Telegram`.

### - [ ] T3: the contacts step uses the confirmed phone

**Files:** `src/pages/book/{ContactsStep.tsx,contactsForm.ts,DoneStep.tsx,bookRefusal.ts}` (+
`bookRefusal.test.ts`), `src/pages/book/booking.test.tsx`, `src/locales/{en,ru}.json`.

- The form: name and note (no phone, no country). `bookBody` sends `locale`.
- No session → the primary action is «Confirm phone in Telegram», which shows `<ConfirmPhone>` in place
  of the action bar's button; on confirm the step shows the phone and «Book» (one more tap, the name and
  note kept — the form stays mounted).
- Session → phone as text + «Not your number?» (`signOut`; the step then asks to confirm again).
- Booking answers 401 `clientSignIn` (the cookie ran out meanwhile) → refetch the session and show
  `<ConfirmPhone>`, not an error.
- Done screen: «Booked on {phone}» from the result's `phone`.

**Check:** `booking.test.tsx` — without a session: name → confirm → book, the body has no `phone`; with a
session: the phone is shown, booking in one tap; 401 → confirmation shown; the done screen shows the phone.
Commit `feat(book): book with the phone confirmed in Telegram`.

### - [ ] T4: no online booking without Telegram

**Files:** `src/pages/book/{BookingPage.tsx,MastersStep.tsx}`, `src/pages/book/booking.test.tsx`,
`src/locales/{en,ru}.json`.

`clientSignIn: false` → step 1 shows the D7 text (kit `EmptyState`, as elsewhere) and no masters; deep
links to later steps land on step 1.

**Check:** test — false → the text, no master buttons; true → as before. Commit `feat(book): say when online booking is off`.

### - [ ] T5: my bookings on step 1, no saved booking

**Files:** create `src/pages/book/MyBookings.tsx`; `src/pages/book/{MastersStep.tsx,BookingPage.tsx,CancelBooking.tsx,MoveBooking.tsx}`;
delete `src/pages/book/savedBooking.ts` (+ `savedBooking.test.ts`); `src/pages/book/{booking.test.tsx,manage.test.tsx}`;
`src/locales/{en,ru}.json`.

With a session, step 1 lists `my-bookings` (when in the business's zone via `dateTimeIn`, master, title,
the client's name when it is not the only one in the list), each a link to `/book/<slug>/my/<id>` (the
route comes in T6b — until then the link is plain and its test only checks the href). Empty list → nothing
shown. Remove every `savedBooking` use and the tests about it; the done screen still shows the manage link.

**Check:** tests — a session with two bookings → both listed with hrefs; no session → no list, no
request to `my-bookings`; `grep -r localStorage src/pages/book` is empty. Commit `feat(book): my bookings`.

### - [ ] T6a: cancel and move take their actions from outside

**Files:** `src/pages/book/{CancelBooking.tsx,MoveBooking.tsx,ManagePage.tsx}`, `src/pages/book/manage.test.tsx`.

A refactor with no change on screen: `CancelBooking` and `MoveBooking` get the mutation (or `onCancel` /
`onMove` returning the booking as it is now, plus pending / error) from their parent instead of calling the
token hooks themselves; `ManagePage` passes the token ones.

**Check:** `manage.test.tsx` green unchanged (except imports). Commit `refactor(book): cancel and move take their actions`.

### - [ ] T6b: a booking of mine

**Files:** `src/app/router.tsx`, create `src/pages/book/MyBookingPage.tsx` and
`src/pages/book/myBooking.test.tsx`, `src/locales/{en,ru}.json`.

Route `/book/$businessSlug/my/$bookingId` (lazy, like `ManagePage`). The item comes from the
`my-bookings` query (no GET by id); not in the list → «This booking isn't yours or is gone» with a link to
step 1. No session → `<ConfirmPhone>`, then the page. Cancel / Move with the id hooks; after either, the
`my-bookings` query refetches.

**Check:** test — open from the list, move → new time shown and the list refetched; cancel → status
cancelled; an id not in the list → the text. `npm run check:chunks` green. Commit `feat(book): cancel and move my booking`.

### - [ ] T7: the client's Telegram can be switched off

**Files:** `src/pages/book/notify/NotifyMe.tsx`, `src/pages/book/notify/notifyMe.test.tsx`.

The Telegram `ChannelRow` gets `onTurnOff` → `DELETE /public/bookings/:token/telegram`, then the manage
query refetches (as the other rows do — see `rowMutation.ts`).

**Check:** test — on → off sends the DELETE and the row shows off. Commit `feat(notify): switch Telegram off`.

### - [ ] T8: e2e, manual scenarios, the plan

**Files:** `e2e/book.spec.ts` (and its mocks), the manual test plan where E7a's lives, this file's status,
the common plan's row T (in BookedUp-back, its own branch and commit).

e2e on mocks: confirm (pending → confirmed) → book → done shows the phone; with a session step 1 lists
bookings and the my-booking page moves one. Manual scenarios with a real test bot: share own contact,
forward someone else's (refused), two browsers (the second gets no session), sign out, cookie gone.

**Check:** `npm run test:e2e`, `npm run check:chunks`, `npm run build` green. Commit `test(book): client sign-in e2e`.
