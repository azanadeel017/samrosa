# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Do all work in the `Om-frontend/` folder. Ignore the pre-existing `backend/` and `frontend/` folders at the repo root — they are legacy/pre-existing and not part of this frontend project. Do not read from, modify, or reference them unless explicitly asked.

## Project Summary

Samrosa's frontend is a **food rescue platform** connecting restaurant donors
with surplus food to shelters, coordinated by volunteer drivers. No money
changes hands — this is donation and logistics, not commerce. The core
lifecycle: `posted → claimed → pickup scheduled → picked up → delivered → logged`.

**Roles:** Donor (restaurant), Shelter, Driver/volunteer, Admin (founders,
full oversight). Donor and Shelter are separate dashboards — never combined.

## Tech Stack

- **Next.js (React) + Tailwind CSS** for the app and styling.
- **Supabase** — Postgres, auth, row-level security for role separation, realtime (chat).
- **Vercel** for hosting.

## Design Direction

Vibe: **warm, friendly, elegant** — restraint over decoration. Cream/white
dominant, generous whitespace, oranges used sparingly as accents.

| Hex | Color | Role |
|-----|-------|------|
| `#C75B12` | Burnt orange | Primary buttons, links, key accents |
| `#CC5A3F` | Terracotta | Secondary accent, hover states |
| `#F7A944` | Marigold | Highlights, badges, icons |
| `#FEC671` | Golden | Soft section backgrounds |
| `#FEEBC0` | Cream | Page background / cards |
| `#FFCC93` | Peach | Subtle fills, dividers |

None of the palette colors pass contrast as body text — use a near-black/dark
brown (`#3A2417`) for text. Typography: humanist sans for body, light serif or
elegant display face for headings. Design **mobile-first** — heavy phone usage
expected (kitchen staff, volunteers on the go).

## Feature List (at a glance)

- **Public site:** landing page, how-it-works, donor/shelter/driver info sections, "Become a donor" CTA.
- **Auth:** email/password, role selection at signup (donor/shelter/driver — admin is created manually), identity confirmation for donors/shelters, terms/liability checkbox.
- **Donor dashboard:** post listings (food type, quantity, allergens, temperature, safe-until time, pickup window), manage active listings, history, running meals-provided stat.
- **Shelter dashboard:** browse/claim listings, favorite donors (affects feed order), history.
- **Driver dashboard:** available pickups with a driver-limit per listing, register under a pickup session, mark picked up/delivered.
- **Volunteer hours:** auto-updates on delivery confirmation, running total, admin export.
- **Admin dashboard:** approve/verify accounts, view all dashboards, read signup submissions, oversee listings/claims/sessions, aggregate impact metrics.
- **Chat:** realtime, admin↔user only — no automated notifications anywhere in the system.
- **Impact metrics:** meals provided, pounds rescued, active donors/shelters, donations completed, total volunteer hours — captured at log time, exportable.

Full detail for any feature lives in `Docs/PROJECT_BRIEF.md` §4 — refer to the
relevant section per build step rather than re-reading the whole brief.

## API Contract Rules

This repository has a binding API contract in `Docs/API CONTRACT.md`. Before
writing any code that sends or receives data across the frontend/backend
boundary, read that file in full. Follow its naming derivation rules exactly:
camelCase JSON fields, the universal `{success, data}` /
`{success, error: {code, message}}` envelopes, ISO 8601 UTC dates, the fixed
error-code enum, and the URL patterns in its section 2. Never invent a field
name — if a concept isn't in the Vocabulary table (section 1), stop and add it
there first, then use the canonical term. If existing code conflicts with the
contract, the contract wins.

## Reference Docs

Before starting frontend work, read `Docs/API CONTRACT.md` (backend API contract) and `Docs/PROJECT_BRIEF.md` (project briefing) — they are the source of truth for endpoints, data shapes, and product intent.
