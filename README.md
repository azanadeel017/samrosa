# Samrosa

**B2B Food Waste Compliance & Logistics Middleware**  
*Connecting surplus food to qualified nonprofits while automating IRC § 170(e)(3) Enhanced Deduction documentation.*

---

## Overview

samrosa is a purpose-built middleware engine designed for the institutional layer of the food economy — the point where surplus food from commercial kitchens, grocery operations, and food manufacturers either enters a certified redistribution channel or is written off as waste.

The platform solves two entangled problems simultaneously:

1. **Logistics**: Matching time-sensitive food surplus with qualified 501(c)(3) recipient organizations in a structured, traceable workflow with cold-chain awareness.
2. **Compliance**: Generating the precise financial and procedural documentation required to claim the IRS Enhanced Deduction under Internal Revenue Code § 170(e)(3) — a deduction worth up to **twice the cost basis** of donated goods.

The local beachhead pilot deploys this engine as the single source of truth for all food donation transactions within a defined commercial district, providing enrolled donors with a zero-friction path from surplus identification to tax-receipt issuance.

---

## The Business Case: IRC § 170(e)(3) Enhanced Deductions

### Standard vs. Enhanced Deduction

Under general rules, a C-corporation donating property may only deduct the lesser of the property's fair market value (FMV) or its cost basis. For perishable food nearing expiration, this often results in a near-zero deduction — the FMV collapses faster than the cost basis is recovered.

IRC § 170(e)(3) creates a carve-out for **qualified food inventory donations** to eligible 501(c)(3) organizations that use the food for the care of the ill, needy, or infants. The enhanced deduction formula is:

$$
D_{enhanced} = \min\left(C + \frac{FMV - C}{2},\ 2C\right) = \min\!\left(\frac{C + FMV}{2},\ 2C\right)
$$

Which simplifies in practical implementation to:

$$
\boxed{D_{enhanced} = \min(2C,\ FMV)}
$$

Where:
- **C** = Donor's cost basis (cost of goods sold / inventory basis)
- **FMV** = Fair market value at the time of the contribution
- **D** = Allowable enhanced deduction amount

### Ceiling Rule

The total enhanced deduction from food inventory donations in a given tax year is capped at **15% of the donor's net income** (for C-corporations) or 15% of **net profit from trade or business** (for S-corporations, partnerships, and sole proprietors). The `tax_receipts.deduction_ceiling` field stores this figure per transaction for documentation purposes.

### Numerical Example

| Parameter | Value |
|---|---|
| Cost basis (C) | $1,200.00 |
| Fair market value (FMV) | $3,000.00 |
| Standard deduction (min(C, FMV)) | $1,200.00 |
| Enhanced deduction (min(2C, FMV)) | **$2,400.00** |
| Incremental deduction value | +$1,200.00 |
| Effective tax benefit at 21% federal rate | **+$252.00** on a single donation |

For a high-volume food service operation donating weekly, this incremental benefit compounds to tens of thousands of dollars annually — transforming a compliance cost center into a measurable financial asset.

### Qualification Requirements

For a donation to qualify under § 170(e)(3), samrosa validates:

1. The **donor** is a C-corporation, S-corporation, partnership, or sole proprietor engaged in a trade or business.
2. The **recipient** is a 501(c)(3) organization whose IRS determination letter is confirmed active (field: `recipients.irs_determination = 'CONFIRMED'`).
3. The donated food is **used solely for the care of the ill, needy, or infants** — enforced through recipient onboarding attestation.
4. The food is **not transferred to the recipient in exchange for money, other property, or services**.
5. The donor receives a **written statement** from the recipient acknowledging the above. This is the `tax_receipts` record.

---

## Repository Structure

samrosa is organized as an enterprise monorepo. Each package is independently deployable and versioned. The root contains only shared configuration (`.gitignore`, `README.md`).

```
samrosa/                              ← Monorepo root
├── .gitignore                        ← Unified ignore rules for all packages
├── README.md                         ← This document
│
├── backend/                          ← Node.js / Express API package
│   ├── package.json
│   ├── .env.example
│   ├── schema.sql                    ← PostgreSQL DDL — single source of truth
│   └── src/
│       ├── server.js                 ← Express bootstrap & lifecycle management
│       ├── db/
│       │   └── index.js              ← pg Pool singleton, query helper, health check
│       ├── routes/
│       │   └── donations.js          ← POST /api/donations/upload router
│       └── services/
│           ├── taxEngine.js          ← IRC § 170(e)(3) computation & receipt engine
│           └── carbonEngine.js       ← GHG emissions avoidance & carbon credit pipeline
│
└── frontend/                         ← Progressive Web App (PWA) package
    ├── index.html                    ← Cashier surplus intake interface
    ├── manifest.json                 ← PWA web app manifest
    ├── sw.js                         ← Service worker (cache-first shell, offline POST queue)
    ├── css/
    │   └── style.css                 ← Design system — dark glassmorphism, Inter typeface
    └── js/
        └── app.js                    ← Application logic, validation, fetch, toast system
```

## Architecture

### Design Principles

- **Dual-layer validation**: Application-layer validation (route handler) followed by database-layer enforcement (CHECK constraints). Neither trusts the other implicitly.
- **Generated columns for financial computation**: `enhanced_deduction` is a PostgreSQL `GENERATED ALWAYS AS` column. The database computes `min(2 × cost_basis, retail_value)` — ensuring mathematical consistency regardless of how a row was inserted.
- **UUID primary keys**: All tables use `gen_random_uuid()` (pgcrypto). This decouples row identity from insertion order, prevents enumeration attacks, and enables safe cross-environment record references (dev → staging → prod data migrations without key collisions).
- **NUMERIC precision**: All monetary values use `NUMERIC(12,2)`. All weights use `NUMERIC(10,3)`. The `FLOAT` / `DOUBLE PRECISION` types are explicitly avoided — binary floating-point cannot represent most decimal fractions exactly, which is unacceptable in financial audit trails.
- **Append-only tax receipts**: The `tax_receipts` table has no `updated_at` column and no application-layer UPDATE path. Once issued, a receipt is immutable. Financial audit requirements mandate that these records never be modified in-place.
- **Fail-fast startup**: The server performs a `SELECT NOW()` health check before accepting any HTTP traffic. Misconfigured database credentials surface immediately on deploy, not at first user request.
- **Graceful shutdown**: SIGTERM and SIGINT handlers drain the pg connection pool before process exit, preventing connection leaks on container restarts.

---

## Database Schema

### Entity Relationship Overview

```
donors ──< donations >── recipients
                │
           tax_receipts
```

One donor may log many donations. A donation may eventually reference one recipient (NULL until matched). Each completed donation may yield exactly one tax receipt.

---

### Table: `donors`

Represents any enrolled food-producing commercial entity.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Globally unique donor identifier |
| `legal_name` | `VARCHAR(255)` | NOT NULL | IRS-registered entity name |
| `trade_name` | `VARCHAR(255)` | — | DBA / trade name if different |
| `ein` | `CHAR(10)` | UNIQUE, format `XX-XXXXXXX` | Employer Identification Number |
| `contact_email` | `VARCHAR(320)` | NOT NULL, UNIQUE, format checked | Primary contact email |
| `contact_phone` | `VARCHAR(20)` | — | Primary contact phone |
| `address_line1` | `VARCHAR(255)` | NOT NULL | Street address |
| `city` | `VARCHAR(100)` | NOT NULL | City |
| `state` | `CHAR(2)` | NOT NULL | ISO 3166-2 state code |
| `postal_code` | `VARCHAR(10)` | NOT NULL | ZIP or ZIP+4 |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | Soft-delete flag |
| `enrolled_at` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` | Platform enrollment timestamp |

**Indices**: `state`, `is_active`, `ein` (partial, non-null only)

---

### Table: `recipients`

Represents qualified 501(c)(3) nonprofit organizations authorized to receive food donations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Globally unique recipient identifier |
| `legal_name` | `VARCHAR(255)` | NOT NULL | IRS-registered entity name |
| `ein` | `CHAR(10)` | NOT NULL, UNIQUE | Required — needed for § 170(e)(3) documentation |
| `irs_determination` | `VARCHAR(50)` | CHECK IN (`PENDING`, `CONFIRMED`, `REVOKED`) | IRS 501(c)(3) status |
| `max_weekly_lbs` | `NUMERIC(10,3)` | NOT NULL, ≥ 0 | Self-reported weekly intake capacity |
| `is_active` | `BOOLEAN` | NOT NULL, default `TRUE` | Soft-delete / suspension flag |

**Indices**: `state`, `is_active`, `irs_determination`

---

### Table: `donations`

The core transactional ledger. Each row is a single food surplus event.

**Status Lifecycle**:
```
PENDING → MATCHED → IN_TRANSIT → DELIVERED → RECEIPT_ISSUED
                                           ↘ VOIDED
```

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Transaction UUID — returned to caller on upload |
| `donor_id` | `UUID` | FK → `donors.id`, ON DELETE RESTRICT | Originating donor |
| `recipient_id` | `UUID` | FK → `recipients.id`, ON DELETE SET NULL, nullable | Assigned recipient (null until MATCHED) |
| `description` | `TEXT` | NOT NULL | Human-readable food description |
| `classification` | `VARCHAR(20)` | CHECK IN (`PERISHABLE`, `SHELF_STABLE`) | Temperature / shelf-life category |
| `total_weight_lbs` | `NUMERIC(10,3)` | NOT NULL, > 0 | Gross weight of donation |
| `item_count` | `INTEGER` | nullable, > 0 | Discrete unit count if applicable |
| `expiration_date` | `DATE` | nullable | Best-by or use-by date |
| `cost_basis` | `NUMERIC(12,2)` | NOT NULL, ≥ 0 | Donor's cost of goods (C) |
| `retail_value` | `NUMERIC(12,2)` | NOT NULL, > 0, ≥ `cost_basis` | Fair market value (FMV) at donation time |
| `enhanced_deduction` | `NUMERIC(12,2)` | GENERATED ALWAYS AS `LEAST(cost_basis * 2, retail_value)` STORED | Computed § 170(e)(3) deduction |
| `pickup_window_start` | `TIMESTAMPTZ` | nullable | Earliest acceptable pickup time |
| `pickup_window_end` | `TIMESTAMPTZ` | nullable, > `pickup_window_start` | Latest acceptable pickup time |
| `requires_cold_chain` | `BOOLEAN` | NOT NULL, default `FALSE` | Cold-chain logistics flag |
| `special_handling` | `TEXT` | nullable | Freeform handling instructions |
| `status` | `VARCHAR(20)` | CHECK IN lifecycle values | Current transaction status |
| `voided_reason` | `TEXT` | NOT NULL when status = `VOIDED` | Mandatory audit trail for voids |
| `logged_at` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` | Merchant submission timestamp |

**Indices**: `donor_id`, `recipient_id` (partial, non-null), `status`, `logged_at DESC`, `classification`, `requires_cold_chain` (partial, true only), compound `(donor_id, status, logged_at DESC)` for compliance report queries.

---

### Table: `tax_receipts`

Immutable financial records. Generated once per delivered donation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Receipt UUID |
| `donation_id` | `UUID` | FK → `donations.id`, UNIQUE, ON DELETE RESTRICT | One-to-one with parent donation |
| `donor_id` | `UUID` | FK → `donors.id`, ON DELETE RESTRICT | Donor snapshot reference |
| `recipient_id` | `UUID` | FK → `recipients.id`, ON DELETE RESTRICT | Recipient snapshot reference |
| `total_weight_lbs` | `NUMERIC(10,3)` | NOT NULL, > 0 | Weight frozen at issuance |
| `cost_basis` | `NUMERIC(12,2)` | NOT NULL | C — frozen at issuance |
| `retail_value` | `NUMERIC(12,2)` | NOT NULL | FMV — frozen at issuance |
| `enhanced_deduction` | `NUMERIC(12,2)` | NOT NULL | `min(2C, FMV)` — stored explicitly for audit independence |
| `deduction_ceiling` | `NUMERIC(12,2)` | NOT NULL, > 0 | Applicable 15%-of-net-income ceiling |
| `tax_year` | `SMALLINT` | CHECK BETWEEN 2020 AND 2099 | Year of contribution |
| `receipt_number` | `VARCHAR(50)` | UNIQUE, format `SR-YYYY-XXXXXXXX` | Human-readable reference |
| `description_snapshot` | `TEXT` | NOT NULL | Food description frozen at issuance |
| `issued_at` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` | Receipt generation timestamp |

> **Note on enhanced_deduction duplication**: Although `donations.enhanced_deduction` is a generated column, `tax_receipts.enhanced_deduction` is stored explicitly. If the formula or cost inputs were ever corrected on the donation row post-delivery, the receipt must reflect the values at the time of issuance, not the corrected values. This is a deliberate audit-isolation design choice.

---

## API Reference

### Base URL

```
http://localhost:3000
```

### Authentication

Authentication middleware is not implemented in v0.1. API key or JWT bearer token middleware is the designated next integration point before any network-accessible deployment.

---

### `GET /health`

Liveness probe. Returns 200 if the process is reachable. Does not probe the database. Suitable for load balancer health checks.

**Response 200**
```json
{
  "status": "ok",
  "service": "samrosa-api",
  "version": "0.1.0",
  "uptime": 42.183
}
```

---

### `GET /ready`

Readiness probe. Executes `SELECT 1` against the database pool. Returns 503 if the database is unreachable. Use this as a Kubernetes `readinessProbe` or container orchestrator health check.

**Response 200**
```json
{
  "status": "ready",
  "database": "connected"
}
```

**Response 503**
```json
{
  "status": "not_ready",
  "database": "unreachable"
}
```

---

### `POST /api/donations/upload`

Merchant food surplus intake. Validates the payload, writes a `PENDING` donation record, and returns the generated transaction UUID. The `enhanced_deduction` is computed by the database and echoed back for immediate donor reference.

**Request Headers**
```
Content-Type: application/json
```

**Request Body**

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `donor_id` | string (UUID) | ✅ | Valid UUID v4, active donor | Enrolling donor identifier |
| `description` | string | ✅ | 3–2000 characters | Human-readable food description |
| `classification` | string | ✅ | `PERISHABLE` or `SHELF_STABLE` | Food temperature / shelf-life category |
| `total_weight_lbs` | number | ✅ | > 0, ≤ 999,999.999 | Gross weight in pounds |
| `cost_basis` | number | ✅ | ≥ 0, ≤ `retail_value` | Donor's cost of goods in USD |
| `retail_value` | number | ✅ | > 0 | Fair market value in USD |
| `item_count` | integer | — | > 0 | Discrete unit count |
| `expiration_date` | string | — | ISO 8601 date | Best-by or use-by date |
| `pickup_window_start` | string | — | ISO 8601 datetime | Earliest pickup time |
| `pickup_window_end` | string | — | ISO 8601 datetime, > `pickup_window_start` | Latest pickup time |
| `requires_cold_chain` | boolean | — | default `false` | Cold-chain logistics requirement |
| `special_handling` | string | — | — | Freeform handling notes |

**Example Request**
```json
{
  "donor_id": "a3f9c421-7d82-4e01-b3cf-9d8a1f0e2c45",
  "description": "Assorted prepared sandwiches and wraps, day-of production, ambient temperature",
  "classification": "PERISHABLE",
  "total_weight_lbs": 47.5,
  "cost_basis": 180.00,
  "retail_value": 423.75,
  "item_count": 95,
  "expiration_date": "2026-07-16",
  "pickup_window_start": "2026-07-15T18:00:00Z",
  "pickup_window_end": "2026-07-15T20:00:00Z",
  "requires_cold_chain": false,
  "special_handling": "Avoid stacking more than 2 trays high."
}
```

**Response 201 — Created**

| Field | Type | Description |
|---|---|---|
| `success` | boolean | `true` |
| `transaction_id` | string (UUID) | Generated donation UUID — use this in all downstream logistics calls |
| `enhanced_deduction` | number | Computed `min(2 × cost_basis, retail_value)` in USD |
| `status` | string | Always `"PENDING"` on initial upload |
| `logged_at` | string | ISO 8601 server-side timestamp of record creation |

```json
{
  "success": true,
  "transaction_id": "d8b3e97f-4a12-4c2b-9f01-7c6e2b8d3a1f",
  "enhanced_deduction": 360.00,
  "status": "PENDING",
  "logged_at": "2026-07-15T18:04:33.221Z"
}
```

> **Enhanced deduction note**: `min(2 × 180.00, 423.75) = min(360.00, 423.75) = 360.00` — the donor's allowable deduction is $360, versus a standard deduction of $180. The `retail_value` ceiling prevented the 2× formula from exceeding FMV.

**Response 400 — Validation Failure**
```json
{
  "success": false,
  "error": "Validation failed.",
  "details": [
    "total_weight_lbs must be greater than 0.",
    "cost_basis must not exceed retail_value (cost of goods cannot exceed fair market value)."
  ]
}
```

**Response 404 — Donor Not Found**
```json
{
  "success": false,
  "error": "Donor not found or is not currently active.",
  "donor_id": "a3f9c421-7d82-4e01-b3cf-9d8a1f0e2c45"
}
```

**Response 500 — Internal Error**
```json
{
  "success": false,
  "error": "An internal server error occurred. Please try again later."
}
```

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 18.0.0
- **PostgreSQL** ≥ 15.0
- **npm** ≥ 9.0.0

### 1. Clone and Install

```bash
git clone <repository-url> samrosa
cd samrosa
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL or individual PGHOST/PGUSER/PGPASSWORD/PGDATABASE values
```

### 3. Provision the Database

```bash
# Create database and user (adjust credentials to match your .env)
psql -U postgres -c "CREATE USER samrosa_user WITH PASSWORD 'strongpassword';"
psql -U postgres -c "CREATE DATABASE samrosa_db OWNER samrosa_user;"

# Apply schema
npm run db:migrate
# or directly:
psql $DATABASE_URL -f schema.sql
```

### 4. Start the Development Server

```bash
npm run dev
# → [server] samrosa API listening on port 3000 (development)
# → [db] Health check passed — db time: 2026-07-15T18:04:33.221Z
```

### 5. Verify Liveness

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

---

## Roadmap

The v0.1 release establishes the transactional database layer and the food surplus intake endpoint. Subsequent milestones target:

- **v0.2** — Donor and recipient registration endpoints, EIN verification integration
- **v0.3** — Donation matching engine: algorithm to assign `PENDING` donations to available recipients based on classification, weight capacity, and proximity
- **v0.4** — Logistics dispatch module: driver assignment, cold-chain routing, pickup confirmation
- **v0.5** — Tax receipt issuance: automated `RECEIPT_ISSUED` transition and PDF generation conforming to IRS substantiation requirements under § 170(f)(8)
- **v0.6** — Donor dashboard API: aggregate deduction summaries, year-to-date reporting, CSV export for tax preparers
- **v1.0** — Authentication (API key + JWT), rate limiting, audit log, and production hardening

---

## License

Proprietary — All rights reserved. Not licensed for redistribution or commercial use outside of authorized pilot operations.

---

*samrosa is designed to make doing the right thing the most financially rational choice.*
