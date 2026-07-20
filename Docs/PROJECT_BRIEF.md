# Food Rescue Platform — Project Brief for Claude Code

## 1. Summary

A web platform that connects restaurants with surplus food to shelters and
soup kitchens in Middlesex County, NJ, and coordinates volunteer drivers to
move that food between them. No money changes hands anywhere in the system —
this is donation and logistics, not commerce.

The two public-facing goals: **sign up restaurant donors** and **tell the
story / raise awareness**. Everything else supports those.

> **Data shapes are defined by the separate API contract** (the agreed seam
> between the frontend and the backend team). This brief describes behavior and
> screens; when in doubt about request/response shapes or field names, defer to
> the API contract, not this document.

## 2. How the model works (read this before building)

1. A **restaurant** posts a surplus food listing.
2. A **shelter** claims that listing as the destination.
3. A **pickup session** opens with a driver limit based on the amount of food.
4. **Drivers** register their name under an open pickup session.
5. A driver marks the food **picked up**, then **delivered**.
6. The completed donation is **logged**; its numbers roll into impact totals,
   and the driver's volunteer hours update automatically.

This lifecycle is the spine of the app. Listings, chat, history, hours, and
metrics all hang off these states:

`posted → claimed → pickup scheduled → picked up → delivered → logged`

## 3. Users & roles

There are **two distinct merchant account types** — they are opposite ends of
the flow and must not share one dashboard:

- **Donor (restaurant)** — supplies surplus food.
- **Shelter** — receives food.

Plus:

- **Driver / volunteer** — transports food from donor to shelter.
- **Admin (us, the founders)** — approves accounts, oversees everything, can
  view every dashboard, chats with users, reads signup submissions, sees
  aggregate impact.

## 4. Feature spec

### Public site (no login)
- Landing page: mission, how it works, impact snapshot.
- Clear **"Become a donor"** call-to-action → restaurant signup.
- Short **"For shelters"** and **"Volunteer as a driver"** info sections.
- Warm, friendly, elegant tone (see §5).

### Auth & onboarding
- Email/password login and signup.
- Role selected at signup: donor, shelter, or driver. Admin accounts are
  created by us, not self-serve.
- **Identity confirmation for donors and shelters.** When a donor or shelter
  creates an account, they must confirm their identity before the account can
  be used. *(Method TBD — e.g. document upload, email/domain check, or manual
  admin verification.)* Drivers do not go through this step.
- **Signup form** collects role-specific info. *(TBD — exact questions to be
  filled in. Leave a clearly labeled placeholder section and store responses so
  admins can review them.)*
- A **donation-terms / liability acknowledgment checkbox** at signup (supports
  Good Samaritan legal protection — see §6).

### Donor (restaurant) dashboard
- Post a surplus listing: food type, **quantity** (free-text notes field —
  used to set the driver limit, checked manually for now), allergens,
  storage/temperature, safe-until time, pickup window.
- View and manage active listings; see which shelter claimed each.
- Donation history (also serves as their own record).
- A simple "you've provided X meals" running stat.

### Shelter dashboard
- Browse available donation listings.
- **Claim / request** a listing as the receiving destination.
- **Favorite donors.** A shelter can favorite specific donors; favorited
  donors' listings appear **at the top of that shelter's feed**. (This replaces
  any per-donor subscription — favorites only affect feed ordering.)
- History of food received.

### Driver / pickup dashboard
- One **"Available Pickups"** tab listing all donations needing transport.
- Each pickup shows a **driver limit** derived from the donation amount
  (larger donations need more drivers).
- Drivers **register their name under a pickup session** (claim a slot);
  sessions fill up to their limit.
- Mark **picked up** and **delivered** to advance the lifecycle.

### Volunteer hours sheet
- Each driver has a **volunteer-hours record**.
- When a drop-off is **confirmed (delivered)**, the hours from that pickup
  session are **added automatically** — no manual entry.
- Drivers see their running total; admins can view and export everyone's hours.
- *(TBD — how hours per run are calculated: session duration, pickup-to-delivery
  time, or a set value per completed run.)*

### Admin dashboard
- Approve / verify new donors, shelters, and drivers.
- **View every dashboard** (donor, shelter, and driver views) for oversight.
- Read signup-form submissions.
- Oversee all active listings, claims, and pickup sessions.
- Aggregate impact metrics and total volunteer hours across all drivers.

### Chat
- Direct messaging between **admins and users** (any role).
- Realtime; tied to user accounts. This is how coordination happens — there is
  no automated notification system (see §8).

### Impact metrics (capture from day one)
- Meals provided, pounds rescued, active donors/shelters, donations completed,
  total volunteer hours.
- Tracked over time and **exportable**. These same numbers support future grant
  applications and are painful to reconstruct after the fact — record them at
  the moment each donation is logged.

## 5. Design direction

Overall vibe: **warm, friendly, elegant.** Elegance here mostly means
restraint — cream/white dominant, generous whitespace, oranges used sparingly
as accents rather than filling large areas.

**Color palette** (from the reference the founder provided):

| Hex | Color | Suggested role |
|-----|-------|----------------|
| `#C75B12` | Burnt orange | Primary buttons, links, key accents |
| `#CC5A3F` | Terracotta | Secondary accent, hover states |
| `#F7A944` | Marigold | Highlights, badges, icons |
| `#FEC671` | Golden | Soft section backgrounds |
| `#FEEBC0` | Cream | Page background / cards |
| `#FFCC93` | Peach | Subtle fills, dividers |

**Important:** every palette color is light or mid-tone, so **none of them are
usable as body text** — they fail contrast. Use a near-black / dark brown such
as `#3A2417` for text, and reserve the oranges for buttons, accents, and
headings-as-accent. Check contrast on any colored button (white text on burnt
orange is fine; on the lighter tones it is not).

**Typography:** a refined humanist sans for body, with a light serif or an
elegant display face for headings to carry the "elegant" note. Keep it to two
families.

**Responsive:** it's a website and will be used heavily on phones (kitchen
staff, volunteers on the go), so design mobile-first and make sure dashboards
and forms work well on small screens.

## 6. Food safety & legal

- Admin **verification/approval** of every donor and shelter before activation
  (this is also where identity confirmation is resolved). Protects food safety
  and leans on shelters' real nonprofit status, which the group's legal
  coverage depends on.
- Food-safety fields on every listing: allergens, food type, temperature,
  safe-until time, quantity.
- **Terms/liability checkbox** at signup, reinforcing Good Samaritan
  protections (Bill Emerson Good Samaritan Food Donation Act; NJ Food Bank
  Good Samaritan Act).

## 7. Recommended tech stack (swap if you prefer)

- **Next.js (React) + Tailwind CSS** — well-documented, Claude Code handles it
  smoothly, Tailwind makes the palette easy to apply consistently.
- **Supabase** — Postgres database, built-in auth, row-level security for clean
  role separation, and realtime (for chat), all in one place. Removes most of
  the plumbing a multi-role app usually needs.
- **Vercel** — free-tier hosting that pairs natively with Next.js.

Rationale: this stack gives auth, role-based dashboards, realtime chat, and a
database with minimal custom backend work and essentially no cost at this
scale. If the team already has a stack in mind, keep the rest of this brief and
substitute here. Note that data shapes still come from the API contract (§1).

## 8. Non-goals / out of scope

- **No payments or money handling** of any kind.
- **No automated notifications** — coordination happens through admin↔user chat.
- No public browsing of listings without an account (beyond the marketing site).
- No native mobile app — responsive web only.

## 9. Open items to resolve

- Exact **signup-form questions** per role (donor / shelter / driver).
- **Identity-confirmation method** for donors and shelters.
- **Volunteer-hours calculation** method per completed run.
- Final **stack confirmation** (data shapes remain governed by the API contract).
