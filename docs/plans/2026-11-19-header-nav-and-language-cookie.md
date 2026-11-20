# Header navigation and language in a cookie — tasks

> **For the executor (Sonnet):** one task = one fresh session (`/clear` between tasks). Work inline,
> no subagents. Read only the files the task names plus this repo's AGENTS.md. If a task turns out
> bigger than described, stop and say so — it gets split, not pushed through. Tick the box when the
> check passes, commit, don't push.
>
> **Status:** recorded 2026-11-19 after the review of PR #38 (questions ❓9, ❓10). Written as two
> tasks, not yet split into session-sized steps: the owner splits them on Opus.

## T1. The cabinet's navigation moves into the header; on a phone it folds into a burger

**Today:** `AppHeader` (logo, language) sits above the cabinet's own row (`CabinetLayout`: the
navigation links and «Sign out») — two rows at the top, on a phone too.

**Wanted:** one header. On a desktop: the logo, the navigation (links by role, as now), the language
and «Sign out». On a phone: the logo and a burger button; the navigation, the language and «Sign out»
open from it. The public booking page and the sign-in screens keep the logo and the language only.

**Touches (to refine):** `src/app/AppHeader.tsx`, `src/pages/cabinet/CabinetLayout.tsx`,
`src/pages/cabinet/Cabinet.module.scss`, `src/pages/cabinet/SignOut.tsx`, the cabinet tests
(`src/pages/cabinet/roles.test.tsx` and the ones that look for the navigation).

**Open:**

- Does the kit have what a burger needs (`IconButton` + `Modal` as a side sheet, or `NavMobileHeader`),
  or does a component go into TedUI first (a kit task, tag, bump here — see usage.md)?
- The header lives at the root, the navigation depends on the cabinet's account and role: how the
  header gets them (the cabinet route's context or the same `GET /me` query) without the sign-in
  screens asking for it.

**Check:** at 390×844 the header is one row with a burger; the burger opens the navigation (the
links a role is allowed, language, sign out), a link closes it and goes there, focus returns to the
burger, Escape closes. At desktop width no burger. No horizontal overflow. `npm run test:e2e` passes.

### Split of T1 into session-sized tasks (2026-11-20)

T1 is too big for one session: the header is at the root, the navigation depends on the account and
role (`GET /me`, loaded by the cabinet route), and the kit has no ready side menu (`NavMobileHeader`
is a header with a «back» arrow; a burger is most likely `IconButton` + `Modal`). Three tasks, in
this order, one session each, one branch `feature/header-nav`:

- [x] **T1a — the header gets the cabinet's menu.** Files: `src/app/AppHeader.tsx`,
      `src/app/RootLayout.tsx`, `src/pages/cabinet/CabinetLayout.tsx`, a new module for the menu entries
      (links by role, as the `roleCan` checks now in `CabinetLayout`), a context the cabinet route fills.
      The header reads the context: no menu on sign-in, sign-up, invite and the booking page (they never
      call `GET /me`). Nothing changes on screen yet; the links by role live in one module instead of
      `CabinetLayout`. **Check:** `roles.test.tsx` and the navigation tests pass unchanged;
      `npm run typecheck` and `npm run lint`.
      _Done: `AppHeader` does not read the store yet (an unused read fails lint) — T1b does, when it renders the links._
- [x] **T1b — one header on desktop.** Files: `AppHeader.tsx`, `AppHeader.module.scss`,
      `CabinetLayout.tsx`, `SignOut.tsx`, `Cabinet.module.scss`, the cabinet tests. The navigation and
      «Sign out» move into the header (logo, links, language, sign out in one row); `CabinetLayout`
      keeps the frame and the page only. **Check:** tests find the navigation in the header; at 1440 px one
      row; `npm run test:e2e` passes.
      _Done: `SignOut` moved to `src/app/`; the store's empty list = the cabinet without a business (sign out, no links); the header is a `<header>` (banner)._
- [x] **T1c — the burger on a phone.** Files: `AppHeader.tsx` (+ a `BurgerMenu.tsx` beside it),
      styles, tests. Under the `mobile` mixin: the logo and an `IconButton` (`aria-label`); it opens a
      `Modal` (`finalFocus` = the button) with the links, the language and «Sign out». A link closes it,
      Escape closes it, focus returns to the button. If `Modal` cannot be a side sheet / a menu, stop:
      that is a kit task (TedUI PR, tag, bump here), not a local override. **Check:** the test from the
      Check below; 390×844 one row, no horizontal overflow; `npm run test:e2e`.
      _Done: `BurgerMenu` = `IconButton` + the kit's `Modal` (a bottom sheet on a phone — no kit change needed); `AppHeader` picks it with `useBreakpoints` in the cabinet only (one copy of the links in the DOM). The language dropdown opens over the sheet._

## T2. The language moves to the back and comes in a cookie

**Today:** the language is in `localStorage` (`src/language.ts`): a new device or the installed PWA
on iOS (its own storage) falls back to the browser's language.

**Wanted:** the back keeps the language of the account and sends it in a cookie; the front starts in
the language of that cookie, and a change in the language dropdown is sent to the back, which sets the
cookie again. `localStorage` is then no longer the source.

**Needs the back first** (BookedUp-back, its own step and plan): where the language lives
(a field of the account), the endpoint that changes it, the cookie (name, `Path`, `SameSite`, whether
it is readable from JS), what a signed-out visitor gets. This front task starts after that is in the
back's Swagger and `npm run api:generate` has been run.

**Touches (to refine):** `src/language.ts` (+ `language.test.ts`), `src/i18n.ts`,
`src/app/LanguageSelect.tsx`, `src/app/languageSwitch.test.tsx`, `AGENTS.md` (the line about where the
language lives).

**Open:**

- A signed-out visitor (sign-in, the client's booking page) has no account: the cookie is set
  without one (the choice is sent by the back to a visitor too), or such a visitor stays on the
  browser's language / `localStorage`.
- If the cookie is `HttpOnly`, the front can't read it: the language then comes with `GET /me` or in
  the page's first response, not from `document.cookie`.
- The dropdown must answer at once, before the back does (the language changes, the request goes
  behind it); what happens if the request fails.

**Check:** a test through `renderApp` + `fakeApi`: the language of the account / cookie wins over the
browser's; choosing a language in the dropdown sends the request and switches the interface; a failed
request does not leave the dropdown and the interface disagreeing.
