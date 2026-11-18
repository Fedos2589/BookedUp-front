# Audit follow-ups — front + kit — Implementation Plan

> **For the executor (Sonnet):** one task = one fresh session (`/clear` between tasks). Work inline,
> no subagents. Read only the files the task names plus that repo's AGENTS.md (and the skills it
> points to). If the task turns out bigger than described, stop and say so — it gets split, not
> pushed through. Tick the task's box when its check passes, commit, don't push.

**Where this comes from:** an outside review of the three repos (ChatGPT, 2026-11-18). Only the
points that held up against the code are here. The back's points are in BookedUp-back
`docs/superpowers/plans/2026-11-18-audit-followups-back.md`.

Not taken, and why — don't re-propose:

- **Build the kit, add an `exports` map, publish artifacts** — the kit ships source on purpose and an
  `exports` map breaks every deep import (ted-ui `AGENTS.md`, «How the package is shipped»). Revisit
  only if a second consumer appears.
- **Bundle size check** — open question already parked for E7 (lazy cabinet chunks); measuring before
  that decision has nothing to act on.

Kit tasks (K) go on their own branch in `~/work/ted-ui`, one PR each; front tasks (F) on one branch
here.

## K-A1 (ted-ui): README stops naming a stale version

- [ ] **Branch** `docs/readme-version` from ted-ui `main`.
- **Problem:** `README.md` shows `npm install github:Fedos2589/TedUI#v0.1.0` and
  `"ted-ui": "github:Fedos2589/TedUI#v0.1.0"`; the kit is at 0.7.0. Every release would have to
  remember to edit it, so it will drift again.
- **Do:** write the tag as `vX.Y.Z` with one line saying where the latest one is
  (the repo's tags page, or `git ls-remote --tags https://github.com/Fedos2589/TedUI`). No version
  number anywhere in `README.md` or `docs/`.
- **Files:** `README.md`.
- **Check:** `grep -rnE 'v?[0-9]+\.[0-9]+\.[0-9]+' README.md docs/` shows no kit version (versions
  of other tools are fine); `npm run lint` passes.

## K-A2 (ted-ui): CI runs the checks AGENTS.md lists

- [ ] **Branch** `ci/checks` from ted-ui `main`.
- **Problem:** AGENTS.md says «There is no CI: run all of them before every PR» — so a PR that skipped
  a check (most often `test:stories`, which needs a browser) merges unnoticed.
- **Do:** `.github/workflows/ci.yml` on `pull_request` and `push` to `main`, modelled on
  BookedUp-front's `.github/workflows/ci.yml` (permissions `contents: read`, concurrency, cancel on
  PRs): `npm ci`, `npm run typecheck`, `npm run lint:ci`, `npm test`,
  `npx playwright install --with-deps --only-shell chromium`, `npm run test:stories`,
  `npm run build-storybook`. Node from a new `.nvmrc` (same major as BookedUp-front's `.nvmrc`).
  `.github/` and `.nvmrc` go into `.npmignore` (CI configs don't ship). In AGENTS.md replace «There
  is no CI: run all of them before every PR» with: CI runs them on every PR; run them locally first
  anyway.
- **Files:** `.github/workflows/ci.yml`, `.nvmrc`, `.npmignore`, `AGENTS.md`.
- **Check:** `npm pack --dry-run` lists no `.github/` and no `.nvmrc`; after the user pushes the branch,
  the PR shows a green CI run. (If `test:stories` needs more than the headless shell in CI, say so
  instead of switching it off.)

## F-A1 (front): README stops naming a stale kit version

- [ ] **Branch** `docs/audit-followups` (this one).
- **Problem:** `README.md` «TedUI in Vite» says the kit is installed by tag
  `github:Fedos2589/TedUI#v0.1.0`; `package.json` pins `v0.7.0`.
- **Do:** say the kit is installed as source by the tag `package.json` pins (no number), and that
  bumping it goes through the kit's `release` skill.
- **Files:** `README.md`.
- **Check:** `grep -n 'TedUI#v' README.md` is empty; `npm run format:check` passes.
