# Build Steps — Frontend Sequence for Claude Code

Follow these in order. Each step is its own separate Claude Code session —
don't chain them together in one long conversation. Test what you get in the
browser before moving to the next step. For specifics on any step, refer
Claude Code to the relevant section of `PROJECT_BRIEF.md` — don't paste the
brief into the prompt.

**Model guide:** use the default model for most steps. Switch to a stronger
model only where marked ⚠️ **(stronger model)** — those are the steps with
real ambiguity or cross-file logic where mistakes are expensive to debug.

---

## Step 0 — Setup (already done if you've run this)

Have Claude Code read `PROJECT_BRIEF.md` in full and generate `CLAUDE.md` at
the repo root, summarizing the stack, design direction, and feature list.
Confirm the project runs before moving on.

- [ ] Confirms project runs locally

---

## Step 1 — Public site

Refer to **§4 (Public site)** and **§5 (design direction)** in the brief.
Build the landing page, how-it-works section, and donor/shelter/volunteer
info sections, using the palette and typography as specified. No auth yet.

- [ ] Landing page
- [ ] How-it-works section
- [ ] Donor / shelter / volunteer info sections
- [ ] Palette + typography applied correctly (check text contrast!)

---

## Step 2 — Auth UI only (no logic yet)

Refer to **§4 (Auth & onboarding)**. Build the login and signup screens,
role selection, and the terms checkbox. No real auth logic yet — screens
and validation only.

- [ ] Login screen
- [ ] Signup screen with role selection
- [ ] Terms/liability checkbox present
- [ ] Placeholder for identity-confirmation step (method still TBD)

---

## Step 3 — Auth logic + role routing ⚠️ (stronger model)

Refer to **§4 (Auth & onboarding)** and **§7 (tech stack)**. Wire real auth
and implement role-based routing so each role lands on its correct
dashboard after login.

- [ ] Real login/signup works
- [ ] Each role redirects to its own dashboard
- [ ] Unapproved accounts handled correctly (pending state)

---

## Step 4 — Dashboards, one at a time

Refer to **§4** for each dashboard's feature list. Run each dashboard as
its own separate session, using placeholder data for now:

- [ ] Donor dashboard
- [ ] Shelter dashboard
- [ ] Driver dashboard
- [ ] Admin dashboard (with view-all-dashboards access)

---

## Step 5 — Cross-cutting features

Refer to **§4** for each feature:

- [ ] Favorites / feed sorting
- [ ] Volunteer hours auto-update on delivery
- [ ] Admin↔user chat

---

## Step 6 — Integration ⚠️ (stronger model)

Connect all placeholder data to the real backend endpoints per the API
contract. Flag any mismatches between what the backend returns and what
the frontend expects.

- [ ] All dashboards pull real data
- [ ] Mismatches with backend flagged and resolved
- [ ] Full lifecycle tested end-to-end: posted → claimed → pickup →
      delivered → logged → hours updated → metrics updated

---

## Open items to check off along the way

These come from **§9** of the brief — resolve them with the team before the
step that needs them:

- [ ] Signup-form questions (needed before Step 2)
- [ ] Identity-confirmation method (needed before Step 3)
- [ ] Volunteer-hours calculation method (needed before Step 5)
