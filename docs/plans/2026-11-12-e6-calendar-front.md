# E6 calendar of bookings — front — Implementation Plan

> **For the executor (Sonnet):** one task = one fresh session (`/clear` between tasks). Work inline,
> no subagents. Read only the files the task names plus this repo's AGENTS.md (and the skills it
> points to). If the task turns out bigger than described, stop and say so — it gets split, not
> pushed through. Tick the task's box when its check passes, commit, don't push.
>
> **When the step is merged:** its last task updates the step's row in the common plan (another repo — its own branch from `main` and its own commit; don't push).

**Goal (epic E6):** an admin sees a day / week grid of the masters' bookings and creates, moves,
cancels bookings in it; a master sees only their own column.

**Common plan** (why each decision was made, the other repos' steps):
`~/work/BookedUp-back/docs/superpowers/plans/2026-11-12-e6-calendar.md`. Open it only if a task
leaves a question this file doesn't answer.

**Before this step:** the back (B1–B10) is merged in BookedUp-back `main`; the kit `ScheduleGrid`
ships in ted-ui `v0.5.0`, which `package.json` already pins. One branch `e6/calendar`, one PR,
reviewed by Opus before merge.

## What the back gives (B1–B10, done)

All under `/businesses/:businessId/appointments`:

| Route                          | Body / query                                                                                     | Errors (409 `code`)           |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------- |
| `GET /`                        | `from`, `to` (local `YYYY-MM-DD`, ≤ 31 days), `staffId?`, `includeCancelled?` (default false)    | —                             |
| `POST /`                       | `staffId, startsAt, endsAt, clientName, clientPhone, note?`, `groupId?` xor `oneOffSessionId?`   | `notFree`, `full`             |
| `POST /walk-ins`               | as a seat; `groupId` xor `oneOffSessionId` required; only today, only a meeting that has started | `notFree`, `notStarted`       |
| `PATCH /:appointmentId/status` | `{ status }`                                                                                     | `badTransition`, `notStarted` |
| `PATCH /:appointmentId`        | `staffId?, startsAt, endsAt, groupId?, oneOffSessionId?` — move to another free slot             | `notFree`, `full`             |

- **A booking takes exactly one free slot** from `GET …/staff/:staffId/slots` (same start and end).
  Slots carry `booked`, `capacity`, `full` for groups and one-off sessions.
- **Statuses:** `BOOKED → CONFIRMED | DONE | NO_SHOW | CANCELLED`; `CONFIRMED → DONE | NO_SHOW | CANCELLED`.
  `DONE` / `NO_SHOW` only once the booking has started. Cancelling a started or past booking is allowed.
- **`NO_SHOW` on an hours booking frees the master's time** (the slot shows up again); on a seat
  it changes nothing.
- **Walk-ins** are created as `DONE` and may go over `capacity`.
- **A booking belongs to the local day it starts**, also when it runs past midnight.
- **Who:** a `MASTER` gets only their own bookings from `GET`; creating / moving / changing follows
  the back's role rules (a 403 is possible for another master's booking).
- **Schedule changes over live bookings** (cancel a group's date, archive a group / one-off session,
  add time off) → 409 `{ code: 'hasBookings', appointmentIds }`.

## Global constraints

- AGENTS.md rules; texts in `src/locales/{en,ru}.json`; API only via the Orval client (`src/api/*`);
  every form calls `useUnsavedInput`; one component per file.
- Times on the grid come from the **business's** clock (`src/dates.ts`), never the browser's.
- Grid views: _day_ = one column per master; _week_ = one master, one column per day.
- Kit `ScheduleGrid` — read `node_modules/ted-ui/docs/agents/usage.md` («ScheduleGrid: what the
  consumer provides»): midnight is `1440`; `onEmptyClick` needs a keyboard twin (a «New booking»
  button); `children` is the item's own text, the grid adds the time.
- Checks before a commit: `npm run typecheck && npm run lint && npm test`.
- Commit messages via `git commit -F - <<'EOF'`.

## Review focus (for the Opus review of the PR)

1. A booking that runs past midnight sits on the day it starts in the grid.
2. A clock change (Europe/Berlin, last Sunday of March): the grid's minutes come from the business's
   clock, not the browser's.
3. A master never sees another master's column or bookings, whatever the URL says.
4. After an hours `NO_SHOW` or a cancel the grid refetches slots as well as bookings.
5. A walk-in is offered only on a started meeting, and the count copes with `N > M`.

---

## Step F — front (branch `e6/calendar`)

### - [ ] F1: API client and `/calendar` page shell

**Files:** `src/api/*` (`npm run api:generate` against the back on `main`), `src/app/router.tsx`
(child of the cabinet route), `src/pages/cabinet/CabinetLayout.tsx` (nav item), create
`src/pages/calendar/{CalendarPage.tsx,Calendar.module.scss,calendarSearch.ts,calendarSearch.test.ts}`,
locales.

Search params: `view: 'day' | 'week'`, `date` (local `YYYY-MM-DD`, default today on the business
clock), `staffId` (week view; default the first master, for a `MASTER` themselves). Header: prev /
today / next, day/week tabs, master picker in week view (reuse `src/pages/schedule/StaffPicker.tsx`).
No grid yet — a placeholder.

**Check:** `calendarSearch.test.ts` (parse / defaults / prev-next over a month end); a page test
that the nav item leads to `/calendar` and the arrows change `date`. Commit `feat(calendar): page shell`.

### - [ ] F2: from bookings and slots to grid columns (pure)

**Files:** create `src/pages/calendar/toColumns.ts`, `toColumns.test.ts`.

`toColumns({view, dates, staff, appointments, slots, timeZone})` → kit `ScheduleGridColumn[]`: day
view one per master, week view one per day; bookings and group/session slots («free N of M») as
items, minutes via `src/dates.ts` on the business zone; a booking past midnight ends at `1440` in
its column.

**Check:** `npm test -- toColumns` — both views; Asia/Bangkok booking at 23:30 UTC lands on the
next local day; group slot label shows free seats. Commit `feat(calendar): bookings into grid columns`.

### - [ ] F3: day and week grid

**Files:** `src/pages/calendar/CalendarPage.tsx`, create `src/pages/calendar/useCalendarData.ts`.

Fetch appointments + slots for the shown range (TanStack Query, Orval hooks), render
`ScheduleGrid` with `toColumns` and `visibleRange`; loading / error states like `SchedulePage`.

**Check:** page test with mocked API: day view shows one column per master and a booking's client
name; week view shows 7 columns. Commit `feat(calendar): day and week grid`.

### - [ ] F4: create a booking in an hours slot

**Files:** create `src/pages/calendar/NewBookingModal.tsx` (+ form hook file if needed), locales.

Click on a free hours slot (and the «New booking» button — the keyboard route) → kit `Modal` with
name, phone (kit `PhoneNumberField`), note → `POST`. 409 `notFree` → message «this time was just
taken», grid refetches. `useUnsavedInput`.

**Check:** page test: create → booking appears; 409 → message shown, modal stays. Commit
`feat(calendar): book a free slot`.

### - [ ] F5: seats in group meetings

**Files:** create `src/pages/calendar/SessionModal.tsx`, locales.

Click on a group / session item → list of its bookings, «free N of M», «add» (same form as F4
with `groupId`/`oneOffSessionId`); 409 `full` → message.

**Check:** page test: add a seat → count grows; full → «add» disabled. Commit `feat(calendar): seats in groups`.

### - [ ] F6: booking details and status

**Files:** create `src/pages/calendar/BookingModal.tsx`, locales.

Click on a booking → client, phone (tel: link), note, status; buttons for allowed moves only
(«What the back gives» → statuses; `DONE`/`NO_SHOW` offered from `BOOKED` too, hidden before
start); «Cancel» via kit `ConfirmDialog`, also on a past booking. An hours `NO_SHOW` frees its
time, so after it the grid refetches slots too.

**Check:** page test: confirm → status shown; cancel → item leaves the grid. Commit
`feat(calendar): booking status and cancel`.

### - [ ] F9: add a walk-in to a started meeting

**Files:** `src/pages/calendar/SessionModal.tsx`, locales.

In F5's modal, once the meeting has started: «add someone who came» (same client form) →
`POST …/appointments/walk-ins`; the new row shows as `DONE`. «free N of M» copes with `N > M`
(«M of M, +K over»); F5's «add» stays for meetings not yet started. 409 `notStarted` → refetch.

**Check:** page test: started meeting → «add someone who came» shown, «add» hidden; full meeting →
walk-in still added and the count reads over capacity. Commit `feat(calendar): walk-ins`.

### - [ ] F7: move a booking

**Files:** `src/pages/calendar/BookingModal.tsx`, create `src/pages/calendar/MoveBooking.tsx`.

«Move» → date picker + list of free slots of that master (and a master picker for admins) → `PATCH`.
Only `BOOKED` / `CONFIRMED` move. 409 → message, slots refetched.

**Check:** page test: move to another slot → item changes place; 409 → message. Commit
`feat(calendar): move a booking`.

### - [ ] F8: schedule screens answer 409 `hasBookings`

**Files:** `src/pages/schedule/groups/*`, `src/pages/schedule/timeOff/*` (only where the call is made), locales.

On 409 `hasBookings` show «N bookings on this date — cancel or move them first» with a link to
`/calendar?date=…`.

**Check:** page tests for cancelling a group date and adding time off with a mocked 409. Commit
`feat(schedule): explain changes refused over bookings`.

### - [ ] F10: close the step in the common plan

**When:** after the `e6/calendar` PR is merged (the PR number and the merge are known only then).
**Repo:** BookedUp-back — `git switch -c docs/e6-front-done origin/main` there.
**Files:** `~/work/BookedUp-back/docs/superpowers/plans/2026-11-12-e6-calendar.md` — only the row `F`
of the «Steps» table: status → `done — F1–F9, PR #N`.

**Check:** `git diff` in BookedUp-back shows that one row and nothing else. Commit there
`docs(plan): E6 front done`; don't push.
