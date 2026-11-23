# E7a online booking — front — Implementation Plan

> **For the executor (Sonnet):** one task = one fresh session (`/clear` between tasks). Work inline,
> no subagents. Read only the files the task names plus this repo's AGENTS.md (and the skills it
> points to). If the task turns out bigger than described, stop and say so — it gets split, not
> pushed through. Tick the task's box when its check passes, commit, don't push.
>
> **When the step is merged:** its last task updates the step's row in the common plan (another repo —
> its own branch from `main` and its own commit; don't push).

**Goal (epic E7a):** `/book/<slug>` on a phone: master (or «any free master») → day and time → name
and phone → done, four screens; a private link to see, cancel or move the booking; the page loads
without the cabinet's code and can be installed to the home screen as this business's app.

**Common plan** (why each decision was made, the other repos' steps):
`~/work/BookedUp-back/docs/superpowers/plans/2026-11-18-e7-online-booking.md`. Open it only if a task
leaves a question this file doesn't answer.

**Before this step:** the back (P1–P9) is merged in BookedUp-back `main`; K6 ships in a ted-ui tag
(G1 bumps it). One branch `e7/public-booking`, one PR, reviewed by Opus before merge.

**Before G1 — a small task in the kit:**

- **K6 (ted-ui, branch `feature/slot-picker`):** a `SlotPicker` — a horizontal strip of days (weekday
  - day number, today marked; scrolls sideways on a phone, arrow keys move between days) and under it
    the chosen day's times as a wrap of toggle buttons (`radiogroup` semantics, one value). A time has a
    label (`10:00`), an optional second line (`Football · free 3 of 10`, a master's name) and can be
    disabled (full). Days without times are shown dimmed but selectable, the list area then shows a
    passed-in empty text. Controlled: `days`, `day`, `onDayChange`, `slots: { id, label, hint?,
disabled? }[]`, `value`, `onChange`, `emptyText`. No dates or time zones inside: the front passes
    ready labels. Stories (hours, groups with hints and a full one, an empty day), no a11y violations,
    exported from `index.tsx`, a minor tag (`v0.8.0`). Check: the stories render in Storybook and the
    kit's tests pass (a test for keyboard moves between days and times).

## What the back gives

All under `/public/…`, no session (the back's CSRF check is by Origin, which the same-origin page sends);
regenerate the client with `npm run api:generate`.

- `GET /public/businesses/:slug` → `{ name, slug, timeZone, masters: { id, name, scheduleMode }[] }`;
  404 unknown slug.
- `GET /public/businesses/:slug/slots?from&to&staffId?` → `Slot[]` (the cabinet's shape: `staffId,
startsAt, endsAt, title, description, capacity, booked, full, groupId, oneOffSessionId`), ≤ 31 days.
- `POST /public/businesses/:slug/bookings` `{ staffId?, startsAt, endsAt, groupId?, oneOffSessionId?,
name, phone, note? }` → 201 `{ booking: { id, staffId, staffName, startsAt, endsAt, title, groupId,
oneOffSessionId }, manageLink }`. No `staffId` = any free master (hours slots only). 409 `notFree`,
  `full`, `tooManyBookings`; 429 after 10 an hour.
- `GET /public/bookings/:token` → `{ business: { name, slug, timeZone }, booking: { …, status },
canChange }`; `POST /public/bookings/:token/cancel`; `PATCH /public/bookings/:token` `{ staffId?,
startsAt, endsAt, groupId?, oneOffSessionId? }` — same 409s, plus `badTransition` once started or
  cancelled. 404 unknown token.
- `GET /public/businesses/:slug/manifest.webmanifest` — the business's manifest.

## Decisions for the screens

- Four screens, each a step of one route `/book/$businessSlug` with the step in search params
  (`?staff=<id|any>&day=…&slot=…`), so Back goes one step back and a reload keeps the place.
- One slots request for 14 days from today (business zone) for all masters, shared by steps 1 and 2.
  Step 1 dims masters with nothing free in those days. «Any free master» first in the list, when at
  least one HOURS master has a free slot.
- «Any»: the hours slots of all masters merged by `startsAt`+`endsAt`, one button each; group meetings
  listed as their own buttons with title and master. Booking an «any» time sends no `staffId`.
- Times and days in the **business's** time zone (`src/dates.ts`), with the zone named under the
  list when it differs from the browser's.
- The success screen shows the booking and the manage link with «Copy» and «save this link — it is
  the only way to cancel or move»; the link is also kept in `localStorage` per business (a convenience,
  wrapped in try/catch) so a return visit shows «Your booking» on step 1.
- No sign-in, no cabinet layout, no cabinet imports in `src/pages/book/**` (oxlint `no-restricted-imports`
  if it fits in G1, else a build check).

## Global constraints

- AGENTS.md and its skills rule; every user-visible string in `src/locales/{ru,en}.json`
  (`locales.test.ts` checks both). Kit components only — no restyling of kit internals.
- Phone: the kit's `PhoneNumberField` as in the cabinet (`src/pages/calendar/ClientPicker.tsx`).
- Every form calls `useUnsavedInput` (PWA update policy).
- Checks before a commit: `npm run typecheck && npm run lint && npm test`; e2e where the task says.

---

### - [x] G1: kit, API, lazy chunks

**Files:** `package.json` (ted-ui `#v0.8.0`), `src/api/**` (generated), `src/app/router.tsx`,
`vite.config.ts` (`build.manifest: true` if the check needs it), create `scripts/check-book-chunk.mjs`,
`package.json` script `check:chunks`, `.github/workflows/*.yml` (run it after the build).

Make every cabinet route and the booking route lazy (TanStack Router `lazyRouteComponent` or
`createLazyRoute` — whichever the router version documents), so the entry chunk holds the router,
i18n, the API client and the kit's shared pieces, not the cabinet's pages. The script reads the build
manifest and fails if the chunks the `/book` route loads import any module under `src/pages/` other
than `src/pages/book/` (and the shared `PagePending`). Print the gzip size of what `/book` loads and of
the precache (`dist/sw.js` list) — record both in the commit message (decision 7 of the common plan).

**Check:** `npm run build && npm run check:chunks` passes; `npm run test:e2e` and `npm run test:pwa`
green (cabinet routes still work). Commit `perf(app): lazy pages, the booking page without the cabinet`.

### - [x] G2: booking page — step 1, masters

**Files:** move `src/pages/BookingPage.tsx` + `.module.scss` into `src/pages/book/`, create
`src/pages/book/{useBookingData.ts,MastersStep.tsx,booking.test.tsx}`, `src/app/router.tsx` (search
params schema), locales.

`useBookingData(slug)`: the business query and the 14-day slots query (from today in the business
zone). Screen: business name as the title, «Any free master» (when an HOURS master has a slot) and the
masters; dimmed «No free time in the next two weeks» for a master without slots. Unknown slug → «No
such page» (no link to the cabinet). Loading → `PagePending`. Picking sets `?staff=`.

**Check:** `booking.test.tsx` (MSW) — masters render, a master without slots is dimmed, «any» hidden
when only GROUPS masters, 404 shows the screen, picking sets the search param. Commit
`feat(book): choose a master`.

### - [x] G3: step 2, day and time

**Files:** create `src/pages/book/{TimeStep.tsx,slotsForPicker.ts,slotsForPicker.test.ts}`,
`src/pages/book/BookingPage.tsx`, locales.

`slotsForPicker(slots, staff, timeZone, masters)` (pure): days of the 14-day window with their labels;
for a day, the picker's slots — a master's own (hours and meetings with «free N of M», full disabled)
or, for «any», hours merged by start+end plus meetings with title and master. `TimeStep` renders the
kit's `SlotPicker`; the first day with a free time is preselected; the zone note when it differs from
the browser's. Picking sets `?day=&slot=` (slot key = `staffId|startsAt|endsAt|groupId|sessionId`,
master part empty for «any»).

**Check:** unit tests for the merge (two masters at 10:00 → one button; a meeting stays separate; a
full meeting disabled; DST day in `Europe/Berlin` labels right); component test: choose a day and a
time. Commit `feat(book): choose a time`.

### - [ ] G4: steps 3–4, contacts and done — split into four small tasks

Step 3: the chosen time and master as a summary, name, phone (`PhoneNumberField`), optional note, the
kit's `ActionBar` button «Book». 409 `notFree` / `full` → back to step 2 with a toast «That time was
just taken», slots refetched; `tooManyBookings` → the message under the button; 429 → «Too many
attempts, try later»; 400 → field errors. Step 4: when, with whom, where (business name), the manage
link with «Copy», the «save this link» text. Step 1 shows «Your booking on …» linking to the saved
booking while it's in the future.

- [x] **G4a `savedBooking.ts`** — `{ manageLink, startsAt }` per slug in `localStorage` (try/catch,
      zod-parsed, gone once started). Files: `src/pages/book/{savedBooking.ts,savedBooking.test.ts}`.
      Check: its test. Commit `feat(book): remember the booking in the browser`.
- [x] **G4b step 3 form** — `contactsForm.ts` (zod schema + request body from the chosen slot),
      `ContactsStep.tsx` (form, `ActionBar`, `useUnsavedInput`), «Continue» on `TimeStep`, `contacts`
      in `bookingSearch.ts`, `BookingPage.tsx` routing, locales. Check: component test — pick a time,
      continue, fill, POST body is right (no `staffId` for «any»), validation errors show.
      Commit `feat(book): contacts step`.
- [x] **G4c refusals** — 409 `notFree`/`full` → step 2 + a note on it (no toast: the app has no ToastProvider, and /book stays light) + slots refetch; `tooManyBookings`,
      429, 400 texts. Files: `ContactsStep.tsx`, `BookingPage.tsx`, locales, `booking.test.tsx`.
      Commit `feat(book): booking refusals`.
- [ ] **G4d done screen** — `DoneStep.tsx` (when, who, where, manage link + «Copy»), saves via
      `savedBooking`, «Your booking on …» on `MastersStep`. Check: a full booking from step 1 to 4 with
      MSW; the saved booking appears on step 1. Commit `feat(book): booking done screen`.

### - [ ] G5: manage page — see, cancel, move

**Files:** `src/app/router.tsx` (`/book/$businessSlug/manage/$token`, lazy), create
`src/pages/book/{ManagePage.tsx,manage.test.tsx}`, reuse `TimeStep`, locales.

Shows the booking (time in the business zone, master, title, status). `canChange` → «Cancel booking»
(kit `ConfirmDialog`) and «Change time» (opens `TimeStep` for the same master; an «any» booking moves
within its master — no «any» on a move) → `PATCH`. Started / cancelled → read-only with the status.
404 → «This link doesn't work». After a cancel the saved booking is cleared.

**Check:** `manage.test.tsx` — read; cancel with confirm; move to another time; `badTransition` shows
read-only; 404 screen. Commit `feat(book): manage a booking by link`.

### - [ ] G6: install the business's page

**Files:** create `src/pages/book/useBusinessManifest.ts` (+ test), `src/pages/book/BookingPage.tsx`,
`src/pages/book/ManagePage.tsx`, maybe `src/pwa/*` if the install prompt needs to know the page.

On `/book/*` replace the `<link rel="manifest">` href with
`/api/public/businesses/<slug>/manifest.webmanifest` and set `apple-mobile-web-app-title` and
`document.title` to the business name; restore the cabinet's on leaving. The service worker stays as
is (one for the whole app).

**Check:** unit test of the hook (href swapped and restored); `npm run test:pwa` green; by hand in
Chrome DevTools → Application → Manifest on `/book/<slug>`: the business's name and `start_url`.
Commit `feat(book): installable as the business's app`.

### - [ ] G7: e2e, test plan, close the step

**Files:** create `e2e/book.spec.ts`, `docs/manual-test-plan.html`, then the common plan in
BookedUp-back.

E2e on 390×844 against the back (as `calendar.spec.ts`): book with «any», reach the done screen in four
screens, open the link, move, cancel; the step's button stays visible with the keyboard open (as
`mobile.spec.ts`). Manual test plan: replace the `/book/…` stub scenario with the booking, manage
link, «any», group seat, 409 race (two tabs), install on iOS / Android; update the TOC, counts and
hashes; republish the artifact (see the plan's header). After the merge: row G and K6 in the common
plan → «done — PR #N / tag», on a branch `docs/e7-front-done` from BookedUp-back `main`.

**Check:** `npm run test:e2e` green. Commit `test(book): e2e and manual scenarios`.
