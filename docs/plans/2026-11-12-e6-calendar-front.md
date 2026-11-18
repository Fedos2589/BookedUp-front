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

**Before F3 — two small tasks in other repos** (each its own branch, plan and PR; the common plan
and its «Steps» table get a row for each):

- **B11 (BookedUp-back):** `GET …/slots` also returns meetings that have started or are over, on
  request — a query flag (`includePast`, name is the back's call), allowed for the roles that open
  the calendar. Today slots start from «now» (`slots.ts` `notBefore`), so a started meeting and its
  bookings would drop out of the grid. Without the flag the answer is unchanged (booking screens
  keep asking for what can be booked). Check: a meeting that started an hour ago is in the answer
  with the flag and not without it; `capacity` / `booked` / `full` are right for it.
- **K4 (ted-ui):** `ScheduleGridItem` gets a `faded?: boolean` (pale overlay, still readable and
  still clickable), a Storybook story, a tag, bump here. Not a local style: AGENTS.md — a missing
  look is a change in the kit.

## Decision: past meetings stay on the grid, faded

The grid loads **all** meetings (groups, one-off sessions) of the shown range — a day, or the whole
week — **including the ones that are over**, so a started or finished meeting keeps its place and its
bookings. A meeting that has **ended** is drawn faded (a pale overlay), so it reads as «gone by».
Nothing can be booked into it: no «add», no click-to-book; for today only a walk-in (F9) is left,
nothing at all for a day before today.

- **Over** = `endsAt` ≤ now on the business's clock (`useNow`). A meeting in progress is not faded.
- Faded only meetings; bookings in hours mode keep their status colour.
- It needs two things from outside this repo, both before F3 — see «Before this step».

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

## Open question for the user

**Move keeps the slot's length, not the booking's** (review of #27, question 8): `MoveBooking` sends
the chosen slot's `endsAt`, because the back takes only an exact slot. Between windows with a different
`slotMinutes` the booking's length changes silently. Recorded in the common plan; until the user
decides, nothing changes here.

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
6. A meeting that has started or ended is still on the grid with its bookings; an ended one is
   faded and cannot be booked into, on any day of the week view.

---

## Step F — front (branch `e6/calendar`)

### - [x] F1: API client and `/calendar` page shell

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

### - [x] F2: from bookings and slots to grid columns (pure)

**Files:** create `src/pages/calendar/toColumns.ts`, `toColumns.test.ts`.

`toColumns({view, dates, staff, appointments, slots, timeZone})` → kit `ScheduleGridColumn[]`: day
view one per master, week view one per day; bookings and group/session slots («free N of M») as
items, minutes via `src/dates.ts` on the business zone; a booking past midnight ends at `1440` in
its column.

**Check:** `npm test -- toColumns` — both views; Asia/Bangkok booking at 23:30 UTC lands on the
next local day; group slot label shows free seats. Commit `feat(calendar): bookings into grid columns`.

### - [x] F3: day and week grid

**Files:** `src/pages/calendar/CalendarPage.tsx`, create `src/pages/calendar/useCalendarData.ts`.

Fetch appointments + slots for the shown range (TanStack Query, Orval hooks) — the whole day, the
whole week — **with the past meetings** (B11's flag), render `ScheduleGrid` with `toColumns` and
`visibleRange`; loading / error states like `SchedulePage`.

**Check:** page test with mocked API: day view shows one column per master and a booking's client
name; week view shows 7 columns. Commit `feat(calendar): day and week grid`.

### - [x] F4: create a booking in an hours slot

**Files:** create `src/pages/calendar/NewBookingModal.tsx` (+ form hook file if needed), locales.

Click on a free hours slot (and the «New booking» button — the keyboard route) → kit `Modal` with
name, phone (kit `PhoneNumberField`), note → `POST`. 409 `notFree` → message «this time was just
taken», grid refetches. `useUnsavedInput`.

**Check:** page test: create → booking appears; 409 → message shown, modal stays. Commit
`feat(calendar): book a free slot`.

### - [x] F11: past meetings are faded and closed to booking

**Needs:** B11 (the back returns past meetings) and K4 (kit `faded`) merged and bumped. After F3.

**Files:** `src/pages/calendar/toColumns.ts`, `toColumns.test.ts` (a `now` input, `faded` on ended
meetings), `src/pages/calendar/CalendarPage.tsx` (passes `useNow()`), locales.

An ended meeting (`endsAt` ≤ now) gets `faded` and says «ended» in its accessible text. Clicking it
still opens F5's modal, which then shows the bookings and **no «add»** (a short note why); in F9 the
walk-in stays for today's meetings.

**Check:** `toColumns` test: ended meeting faded, one in progress not; page test: last week's meeting
is on the grid with its bookings, has no «add». Commit `feat(calendar): past meetings`.

### - [x] F5a: the client form as its own piece

**Files:** `src/pages/calendar/NewBookingModal.tsx`, create `src/pages/calendar/ClientFields.tsx`
(name, phone, note fields) and `src/pages/calendar/useClientForm.ts` (the `useForm` with
`bookingSchema`, defaults by language, `useUnsavedInput`, `values → {clientName, clientPhone, note}`).

A pure extraction: F4's dialog uses them, F5b / F9 reuse them. No behaviour change.

**Check:** `npm test` — F4's page tests pass untouched. Commit `refactor(calendar): client form shared`.

### - [x] F5b: seats in group meetings

**Files:** create `src/pages/calendar/SessionModal.tsx`, `src/pages/calendar/meetingOf.ts` (+ test:
grid item id `${meetingId}@${startsAt}` → the meeting's slot and its bookings), `CalendarGrid.tsx`
(`onItemClick` on a meeting item), locales.

Click on a group / session item → `SessionModal`: list of its bookings (`groupId` /
`oneOffSessionId` + same `startsAt`), «free N of M», «add» (`ClientFields` with `groupId` /
`oneOffSessionId`); 409 `full` → message, `onChanged` refetches. A meeting that has ended
(F11): bookings shown, **no «add»**, a short note why.

**Check:** page test: add a seat → count grows; full → «add» disabled; last week's meeting → no
«add». Commit `feat(calendar): seats in groups`.

### - [x] F6: booking details and status

**Files:** create `src/pages/calendar/BookingModal.tsx`, locales.

Click on a booking → client, phone (tel: link), note, status; buttons for allowed moves only
(«What the back gives» → statuses; `DONE`/`NO_SHOW` offered from `BOOKED` too, hidden before
start); «Cancel» via kit `ConfirmDialog`, also on a past booking. An hours `NO_SHOW` frees its
time, so after it the grid refetches slots too.

**Check:** page test: confirm → status shown; cancel → item leaves the grid. Commit
`feat(calendar): booking status and cancel`.

### - [x] F9: add a walk-in to a started meeting

_Done in PR #26 with the review fixes (`joinMode` in `meetingOf.ts`: seat ahead, walk-in once started on its own day)._

**Files:** `src/pages/calendar/SessionModal.tsx`, locales.

In F5's modal, once the meeting has started: «add someone who came» (same client form) →
`POST …/appointments/walk-ins`; the new row shows as `DONE`. «free N of M» copes with `N > M`
(«M of M, +K over»); F5's «add» stays for meetings not yet started. 409 `notStarted` → refetch.

**Check:** page test: started meeting → «add someone who came» shown, «add» hidden; full meeting →
walk-in still added and the count reads over capacity. Commit `feat(calendar): walk-ins`.

### - [x] F7: move a booking

**Files:** `src/pages/calendar/BookingModal.tsx`, create `src/pages/calendar/MoveBooking.tsx`.

«Move» → date picker + list of free slots of that master (and a master picker for admins) → `PATCH`.
Only `BOOKED` / `CONFIRMED` move. 409 → message, slots refetched.

**Check:** page test: move to another slot → item changes place; 409 → message. Commit
`feat(calendar): move a booking`.

### - [x] F8: schedule screens answer 409 `hasBookings`

**Files:** `src/pages/schedule/groups/*`, `src/pages/schedule/timeOff/*` (only where the call is made), locales.

On 409 `hasBookings` show «N bookings on this date — cancel or move them first» with a link to
`/calendar?date=…`.

**Check:** page tests for cancelling a group date and adding time off with a mocked 409. Commit
`feat(schedule): explain changes refused over bookings`.

### - [x] F12: one place for «free hours» and the slot choice

_From the review of PR #27 (finding 1 came from these copies drifting apart)._

**Files:** create `src/pages/calendar/SlotCombobox.tsx`; `src/pages/calendar/newBooking.ts` (a
`freeSlotsOf(slots, masters, now)`: free hours of a master on screen, ahead of now);
`CalendarGrid.tsx`, `NewBookingModal.tsx`, `MoveBooking.tsx` use them.

Today «free and the master is on screen», the slot label and the Combobox with «no free time» are
written three times. Take them to one place; the rule «a slot taken meanwhile leaves nothing
chosen» (not another slot) lives there once. A pure extraction, no behaviour change.

**Check:** `npm test` — the page tests of F4 and F7 pass untouched; a `freeSlotsOf` unit test.
Commit `refactor(calendar): free hours and slot choice in one place`.

### - [x] F13: booking dialogs — one dialog with steps, checked at 390 px

_From the review of PR #27 (question 9). **Looked at, split into F13a and F13b.** The kit `Modal` is
controlled (`isVisible`; `title`, `subtitle`, `buttons`, `children`, `role` are plain props), so one
mounted `Modal` can swap its content and buttons without remounting — F13 is not «left as it is»._

Details, the cancel question and the move are three `Modal`s opened one after another: focus jumps
to the grid in between, the animation plays twice, «Back» from the move loses the chosen day and
hour. A started `BOOKED` booking has six buttons in the footer.

#### - [x] F13a: one `Modal`, three steps, «Back» keeps the move's choice

**Files:** `src/pages/calendar/BookingModal.tsx`, `MoveBooking.tsx` → split into
`useMoveBooking.ts` (the state: `date`, `chosen`, the slots query, the `move` mutation, `slot`,
`useUnsavedInput`; the slots query is `enabled` only on the move step) and `MoveFields.tsx` (the
date picker, `SlotCombobox`, the error — a body, no `Modal`); delete `MoveBooking.tsx`.

`BookingModal` keeps `step: 'details' | 'move' | 'cancel'` and calls `useMoveBooking` itself, so
leaving the move step does not drop `date` / `chosen`. One `Modal` for all steps: title, subtitle,
body and `buttons` per step; the cancel step has `role="alertdialog"` and the red confirm button
(`ConfirmDialog` is no longer used here). The move form's submit button stays `type="submit"
form={formId}`. Footer buttons are the same as now — F13b changes them.

**Check:** the page tests of F6 and F7 pass **untouched**; one new test: pick another day and hour in
the move, press «Back», press «Move» again → the same day and hour are still chosen, and no second
dialog was mounted (`getAllByRole('dialog')` stays one). Commit `refactor(calendar): booking dialog in steps`.

#### - [x] F13b: the footer at 390 px holds the main action

**Needs:** F13a. **Files:** `src/pages/calendar/BookingModal.tsx`, `Calendar.module.scss` (layout
only), `e2e/calendar.spec.ts` (new; mocked `/api`, like `e2e/mobile.spec.ts`), locales if a label is new.

On the details step the footer is «Close» and **one** main action (`DONE` for a started booking,
otherwise `CONFIRMED`; nothing for a final status). The other moves — «Move», «Confirm» on a started
`BOOKED`, «No-show», «Cancel booking» — go to a row of ghost buttons in the body, under the status.
Test names of the buttons stay the same, so F6 / F7 tests pass untouched (they look inside the dialog).

**Check:** `npm test`; `npm run test:e2e` — a started `BOOKED` booking at 390×844 touch: nothing
overflows (`scrollWidth` = 390), the footer's buttons all fit in the viewport. Commit
`feat(calendar): booking dialog fits a phone`.

### - [x] F10: close the step in the common plan

**When:** after the `e6/calendar` PR is merged (the PR number and the merge are known only then).
**Repo:** BookedUp-back — `git switch -c docs/e6-front-done origin/main` there.
**Files:** `~/work/BookedUp-back/docs/superpowers/plans/2026-11-12-e6-calendar.md` — only the row `F`
of the «Steps» table: status → `done — F1–F11, PR #N`.

**Check:** `git diff` in BookedUp-back shows that one row and nothing else. Commit there
`docs(plan): E6 front done`; don't push.
