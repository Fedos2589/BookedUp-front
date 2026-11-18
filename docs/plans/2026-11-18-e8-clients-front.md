# E8 clients — front — Implementation Plan

> **For the executor (Sonnet):** one task = one fresh session (`/clear` between tasks). Work inline,
> no subagents. Read only the files the task names plus this repo's AGENTS.md (and the skills it
> points to). If the task turns out bigger than described, stop and say so — it gets split, not
> pushed through. Tick the task's box when its check passes, commit, don't push.
>
> **When the step is merged:** its last task updates the step's row in the common plan (another repo —
> its own branch from `main` and its own commit; don't push).

**Goal (epic E8):** the cabinet gets a client list with search, a client card with history, notes and
no-shows, creating and editing clients, and the booking dialog picks a client instead of typing a
name and a phone. One phone is one account that can bring several people (a mother and her child).

**Common plan** (why each decision was made, the other repos' steps):
`~/work/BookedUp-back/docs/superpowers/plans/2026-11-18-e8-clients.md`. Open it only if a task leaves
a question this file doesn't answer.

**Before this step:** the back (C1–C5) is merged in BookedUp-back `main`; K5 ships in a ted-ui tag
that `package.json` pins (F1 bumps it). One branch `e8/clients`, one PR, reviewed by Opus before merge.

**Before F1 — a small task in the kit:**

- **K5 (ted-ui, branch `feature/empty-state`):** an `EmptyState` component — an icon slot, a title,
  an optional text and an optional action (a `Button` passed as a child), centred, one column on a
  phone. A Storybook story with and without an action, no a11y violations, exported from `index.tsx`,
  a minor tag (`v0.7.0`). Check: the story renders in Storybook and the kit's tests pass.

## What the back gives

All under `/businesses/:businessId`, every member may call them; regenerate the client with
`npm run api:generate` against the back's `/api/docs-json`.

- `Client`: `{ id, name, phone | null, guardianId | null, guardian: { id, name, phone } | null,
note | null, noShowCount }`. A person has either their own `phone` (an account holder) or a
  `guardian` (a holder) — never both.
- `GET /clients?q&limit&offset` → `{ items: Client[], total }`, by name. `q` matches name or phone
  digits. `GET /clients?phone=+7…` → that account: the holder first, then the dependents.
- `POST /clients` with `{ name, note?, phone }` or `{ name, note?, guardianId }` → 201 `Client`;
  409 `code: 'phoneTaken'` + `clientId` of the existing holder; 409 `notHolder` when the guardian is
  a dependent.
- `GET /clients/:id` → `Client` + `dependents: { id, name }[]` + `visitCount`.
- `PATCH /clients/:id` `{ name?, phone?, note? }` → `Client`; `phone` on a dependent → 409 `notHolder`;
  taken phone → 409 `phoneTaken`.
- `GET /clients/:id/appointments?limit&offset` → `{ items: Appointment[], total }`, newest first,
  cancelled included. A master gets only their own bookings.
- Booking and walk-in now take **either** `clientId` **or** `newClient` (the `POST /clients` body)
  instead of `clientName` + `clientPhone`; 409 adds `phoneTaken` / `notHolder`. `Appointment` gets
  `clientId`; `clientName` / `clientPhone` stay as a snapshot of the booking time.

## Decisions for the screens

- A known phone in the booking dialog shows the account's people — the holder and their dependents —
  plus «A new person on this number». The card's name is never overwritten by what was typed.
- The client list is rows (name, phone or «via <guardian>», no-shows if > 0), not a table; paging is
  «Show more» (`offset += limit`), not page numbers.
- A master sees the client list too (they book their own clients); the card's history shows only
  their own bookings — the back already filters, the screen shows what comes.

## Global constraints

- AGENTS.md and its skills rule; every user-visible string in `src/locales/{ru,en}.json`
  (`locales.test.ts` checks both).
- Checks before a commit: `npm run typecheck && npm run lint && npm test`; e2e where the task says.

---

### - [x] F1: regenerate the API, bump the kit, keep the calendar working

**Files:** `package.json` (ted-ui `#v0.7.0`), `src/api/**` (generated), `src/pages/calendar/useClientForm.ts`,
`src/pages/calendar/newBooking.ts` (+ its test), whatever `tsc` flags in `src/pages/calendar/`.

`npm install`, `npm run api:generate`. The booking input changed: make the existing dialog send
`newClient: { name, phone, note? }` where it sent `clientName` / `clientPhone` (`clientOf` in
`useClientForm.ts`), so the calendar keeps working before F5. Show the new 409 `phoneTaken` as the
phone field's error («This number is already a client») for now.

**Check:** `npm run typecheck && npm test` green; `calendar.test.tsx` books with `newClient`.
Commit `chore(api): clients from the back, kit v0.7.0`.

### - [x] F2: client list

**Files:** `src/app/router.tsx` (route `/clients`), `src/pages/cabinet/CabinetLayout.tsx` (nav link
«Clients» after «Calendar»), create `src/pages/clients/{ClientsPage.tsx,ClientRow.tsx,Clients.module.scss,clients.test.tsx}`,
locales.

Search field (debounced 300 ms, `q` in the route's search params so Back keeps it), rows of
`ClientRow` linking to `/clients/$clientId`, «Show more» while `items.length < total`, `EmptyState`
for no clients («No clients yet» + «Add client» action) and for no matches. «Add client» opens F4's
dialog — leave a disabled button until F4.

**Check:** `clients.test.tsx` (MSW, as `team.test.tsx`) — rows render with phone or «via Anna»; typing
in search refetches with `q`; «Show more» appends; empty business shows the empty state. Commit
`feat(clients): list with search`.

### - [x] F3: client card

**Files:** `src/app/router.tsx` (route `/clients/$clientId`), create
`src/pages/clients/{ClientPage.tsx,ClientHistory.tsx,client.test.tsx}`, locales.

Name, phone (or «via <guardian>» linking to the guardian's card), dependents linking to their cards,
counters «Visits N · No-shows M» (no-shows highlighted when > 0), note, history: date and time in the
business's time zone (reuse the calendar's formatting from `src/dates.ts`), master, status; «Show more»
as in F2. «Edit» opens F4's dialog — disabled until F4. 404 → «No such client» with a link to the list.

**Check:** `client.test.tsx` — a holder's card lists dependents; a dependent's card links to the
guardian; history renders statuses and «Show more»; 404 state. Commit `feat(clients): client card`.

### - [x] F4: create and edit a client

**Files:** create `src/pages/clients/{ClientDialog.tsx,clientForm.ts,clientForm.test.ts}`,
`ClientsPage.tsx`, `ClientPage.tsx` (enable the buttons), locales.

One dialog, two modes. **Create:** name, «Has own phone» / «Comes with someone» (radio); own phone →
`PhoneNumberField` (as `ClientFields.tsx`); with someone → a `Combobox` over `GET /clients?q=` showing
holders only, then `guardianId`. Note. On 409 `phoneTaken` the phone field says so and offers «Open
<their name>» (link to that card). **Edit:** name, phone (holders only), note; `note` emptied → `null`.
After success invalidate the list and the card queries; navigate to the new card on create.

**Check:** `clientForm.test.ts` — the body built for each mode; component test: create a holder, create
a dependent through the combobox, `phoneTaken` shows the link, edit sends only changed fields.
Commit `feat(clients): create and edit`.

### - [ ] F5: client picker component

**Files:** create `src/pages/calendar/{ClientPicker.tsx,clientPicker.ts,clientPicker.test.ts,ClientPicker.test.tsx}`, locales.

A controlled component whose value is `{ clientId } | { newClient }` (the booking body's part), or
`undefined` while incomplete:

1. One search `Combobox` over `GET /clients?q=` (name or phone) — picking a person gives `{ clientId }`.
2. «New client» → name + phone fields. When the phone is a whole number, look it up
   (`GET /clients?phone=`); if the account exists, show its people as a radio list
   (holder, dependents) plus «A new person on this number» (name field → `newClient` with
   `guardianId` = the holder). Otherwise `newClient` with the phone.

Pure logic (what value the current inputs make) lives in `clientPicker.ts` with unit tests.

**Check:** unit tests for every branch of the value; component test with MSW: pick by search; a
known phone shows Anna, Masha, «a new person»; a new person sends `guardianId`. Commit
`feat(calendar): client picker`.

> If the component doesn't fit one session, split into «search» and «new client with phone lookup».

### - [ ] F6: the booking dialog and walk-ins use the picker

**Files:** `src/pages/calendar/{NewBookingModal.tsx,SessionModal.tsx,useClientForm.ts,newBooking.ts}`,
delete `ClientFields.tsx` if unused, `calendar.test.tsx`, locales.

Replace the name + phone fields with `ClientPicker`; the note stays on the booking. The submit button
is disabled while the picker's value is `undefined`. 409 `phoneTaken` / `notHolder` → the picker's
error. Unsaved input (`useUnsavedInput`) still reports a half-filled picker. In a booking's details
the client's name links to `/clients/$clientId`.

**Check:** `calendar.test.tsx` — book an existing client, book a new person on a known phone, a walk-in
by an existing client; `npm run test:e2e` green (update the booking e2e to the picker). Commit
`feat(calendar): book a client from the base`.

### - [ ] F7: close the step

After the PR is merged: in BookedUp-back `docs/superpowers/plans/2026-11-18-e8-clients.md` set rows F
and K5 to «done — PR #N / tag», on a branch `docs/e8-front-done` from that repo's `main`. Commit, don't push.
