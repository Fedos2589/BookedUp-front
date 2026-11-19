# Design epic — the whole interface, visually good and convenient

> **Status:** recorded, not split into tasks yet. Splitting and planning happen on Opus, by the
> owner, in a plan file of its own; this file only keeps the epic's intent.

**Goal:** the whole interface — the business cabinet and the public booking page — looks good and
is convenient to use. Today's look (found while testing by hand on 2026-11-19) is not good enough.

**Scope (to be refined when split):**

- Both products: the cabinet (`/`, owner, admin, master) and the public booking page
  (`/book/$businessSlug`, a client on a phone).
- Visual design (look, density, hierarchy) and convenience (navigation, flows, mobile).
- Much of it likely lands in the kit (TedUI): a missing look or component is a kit change, not a
  local override (AGENTS.md), so the epic probably spans two repos.

**Open questions for the split:** what exactly is wrong first; whether there are mock-ups or a
reference product; which product goes first; what the kit has to gain.

**Already in this direction:** the header with the logo and the language dropdown, and the
centring rule for full-screen pages (PR #38).
