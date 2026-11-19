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
