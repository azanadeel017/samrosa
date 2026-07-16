-- =============================================================================
-- samrosa — PostgreSQL Database Schema
-- Version : 0.1.0
-- Engine  : PostgreSQL 15+
--
-- Design principles:
--   • All primary keys are UUID v4 — globally unique across shards/environments.
--   • All monetary values stored as NUMERIC(12,2) — no floating-point rounding.
--   • Weights stored as NUMERIC(10,3) to support sub-pound precision.
--   • Every table carries created_at / updated_at managed by a shared trigger.
--   • CHECK constraints enforce domain invariants at the database layer,
--     independent of application-layer validation.
--   • Indices target the query patterns most common in compliance reporting and
--     logistics dispatch (donor lookups, status filters, date range scans).
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- composite GIN indices

-- ── Shared audit-timestamp trigger function ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE: donors
-- Represents any food-producing commercial entity enrolled in the platform:
-- restaurants, grocery chains, catering operations, food manufacturers, etc.
-- =============================================================================
CREATE TABLE IF NOT EXISTS donors (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name          VARCHAR(255)  NOT NULL,
  trade_name          VARCHAR(255),
  ein                 CHAR(10)      UNIQUE,         -- Employer Identification Number (XX-XXXXXXX)
  contact_email       VARCHAR(320)  NOT NULL UNIQUE,
  contact_phone       VARCHAR(20),
  address_line1       VARCHAR(255)  NOT NULL,
  address_line2       VARCHAR(255),
  city                VARCHAR(100)  NOT NULL,
  state               CHAR(2)       NOT NULL,
  postal_code         VARCHAR(10)   NOT NULL,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  enrolled_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT donors_ein_format
    CHECK (ein IS NULL OR ein ~ '^\d{2}-\d{7}$'),
  CONSTRAINT donors_email_format
    CHECK (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE TRIGGER donors_set_updated_at
  BEFORE UPDATE ON donors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_donors_state     ON donors (state);
CREATE INDEX IF NOT EXISTS idx_donors_is_active ON donors (is_active);
CREATE INDEX IF NOT EXISTS idx_donors_ein       ON donors (ein) WHERE ein IS NOT NULL;

-- =============================================================================
-- TABLE: recipients
-- Represents qualified 501(c)(3) nonprofits and food banks authorized to
-- receive donated food under IRS requirements for enhanced deduction eligibility.
-- =============================================================================
CREATE TABLE IF NOT EXISTS recipients (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name          VARCHAR(255)  NOT NULL,
  ein                 CHAR(10)      NOT NULL UNIQUE,
  irs_determination   VARCHAR(50)   NOT NULL DEFAULT 'PENDING',  -- PENDING | CONFIRMED | REVOKED
  contact_email       VARCHAR(320)  NOT NULL UNIQUE,
  contact_phone       VARCHAR(20),
  address_line1       VARCHAR(255)  NOT NULL,
  address_line2       VARCHAR(255),
  city                VARCHAR(100)  NOT NULL,
  state               CHAR(2)       NOT NULL,
  postal_code         VARCHAR(10)   NOT NULL,
  max_weekly_lbs      NUMERIC(10,3) NOT NULL DEFAULT 0,          -- weekly intake capacity
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT recipients_ein_format
    CHECK (ein ~ '^\d{2}-\d{7}$'),
  CONSTRAINT recipients_email_format
    CHECK (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT recipients_irs_determination_values
    CHECK (irs_determination IN ('PENDING', 'CONFIRMED', 'REVOKED')),
  CONSTRAINT recipients_capacity_non_negative
    CHECK (max_weekly_lbs >= 0)
);

CREATE TRIGGER recipients_set_updated_at
  BEFORE UPDATE ON recipients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_recipients_state          ON recipients (state);
CREATE INDEX IF NOT EXISTS idx_recipients_is_active      ON recipients (is_active);
CREATE INDEX IF NOT EXISTS idx_recipients_irs_status     ON recipients (irs_determination);

-- =============================================================================
-- TABLE: donations
-- Core transactional table. Each row represents a single food surplus event
-- logged by a donor merchant. Status lifecycle:
--   PENDING → MATCHED → IN_TRANSIT → DELIVERED → RECEIPT_ISSUED | VOIDED
-- =============================================================================
CREATE TABLE IF NOT EXISTS donations (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id            UUID            NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  recipient_id        UUID            REFERENCES recipients(id) ON DELETE SET NULL,

  -- ── Food Metadata ──────────────────────────────────────────────────────────
  description         TEXT            NOT NULL,
  classification      VARCHAR(20)     NOT NULL,     -- PERISHABLE | SHELF_STABLE
  total_weight_lbs    NUMERIC(10,3)   NOT NULL,
  item_count          INTEGER,
  expiration_date     DATE,

  -- ── Financial Metadata (all USD) ──────────────────────────────────────────
  -- cost_basis: donor's cost of goods (C)
  -- retail_value: fair market value at point of donation (FMV)
  -- enhanced_deduction is computed: min(2C, FMV) per IRC § 170(e)(3)
  cost_basis          NUMERIC(12,2)   NOT NULL,
  retail_value        NUMERIC(12,2)   NOT NULL,
  enhanced_deduction  NUMERIC(12,2)   GENERATED ALWAYS AS (
                        LEAST(cost_basis * 2, retail_value)
                      ) STORED,

  -- ── Logistics ─────────────────────────────────────────────────────────────
  pickup_window_start TIMESTAMPTZ,
  pickup_window_end   TIMESTAMPTZ,
  requires_cold_chain BOOLEAN         NOT NULL DEFAULT FALSE,
  special_handling    TEXT,

  -- ── Status & Audit ────────────────────────────────────────────────────────
  status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
  voided_reason       TEXT,
  logged_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  matched_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- ── Domain Constraints ────────────────────────────────────────────────────
  CONSTRAINT donations_classification_values
    CHECK (classification IN ('PERISHABLE', 'SHELF_STABLE')),

  CONSTRAINT donations_status_values
    CHECK (status IN ('PENDING', 'MATCHED', 'IN_TRANSIT', 'DELIVERED', 'RECEIPT_ISSUED', 'VOIDED')),

  CONSTRAINT donations_weight_positive
    CHECK (total_weight_lbs > 0),

  CONSTRAINT donations_cost_basis_non_negative
    CHECK (cost_basis >= 0),

  CONSTRAINT donations_retail_value_positive
    CHECK (retail_value > 0),

  CONSTRAINT donations_cost_basis_lte_retail
    CHECK (cost_basis <= retail_value),

  CONSTRAINT donations_item_count_positive
    CHECK (item_count IS NULL OR item_count > 0),

  CONSTRAINT donations_pickup_window_valid
    CHECK (pickup_window_end IS NULL OR pickup_window_start IS NULL
           OR pickup_window_end > pickup_window_start),

  CONSTRAINT donations_voided_reason_required
    CHECK (status != 'VOIDED' OR voided_reason IS NOT NULL)
);

CREATE TRIGGER donations_set_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Core reporting indices
CREATE INDEX IF NOT EXISTS idx_donations_donor_id        ON donations (donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_recipient_id    ON donations (recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_status          ON donations (status);
CREATE INDEX IF NOT EXISTS idx_donations_logged_at       ON donations (logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_classification  ON donations (classification);
CREATE INDEX IF NOT EXISTS idx_donations_cold_chain      ON donations (requires_cold_chain) WHERE requires_cold_chain = TRUE;

-- Compound index: compliance report query (donor + date range + status)
CREATE INDEX IF NOT EXISTS idx_donations_donor_status_date
  ON donations (donor_id, status, logged_at DESC);

-- =============================================================================
-- TABLE: tax_receipts
-- Immutable records generated after successful delivery confirmation.
-- One receipt per donation. Once issued, records are append-only.
-- =============================================================================
CREATE TABLE IF NOT EXISTS tax_receipts (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id         UUID          NOT NULL UNIQUE REFERENCES donations(id) ON DELETE RESTRICT,
  donor_id            UUID          NOT NULL REFERENCES donors(id) ON DELETE RESTRICT,
  recipient_id        UUID          NOT NULL REFERENCES recipients(id) ON DELETE RESTRICT,

  -- ── Snapshot values frozen at time of issuance ───────────────────────────
  -- These mirror the donation row at delivery time and must not change.
  total_weight_lbs    NUMERIC(10,3) NOT NULL,
  cost_basis          NUMERIC(12,2) NOT NULL,
  retail_value        NUMERIC(12,2) NOT NULL,
  enhanced_deduction  NUMERIC(12,2) NOT NULL,   -- min(2C, FMV) — stored explicitly for auditability
  deduction_ceiling   NUMERIC(12,2) NOT NULL,   -- typically 15% of donor AGI, app-supplied
  tax_year            SMALLINT      NOT NULL,
  description_snapshot TEXT         NOT NULL,

  -- ── Identifiers ───────────────────────────────────────────────────────────
  receipt_number      VARCHAR(50)   NOT NULL UNIQUE,   -- human-readable: SR-YYYY-XXXXXXXX
  issued_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- ── Constraints ───────────────────────────────────────────────────────────
  CONSTRAINT tax_receipts_weight_positive
    CHECK (total_weight_lbs > 0),

  CONSTRAINT tax_receipts_financials_sound
    CHECK (cost_basis >= 0 AND retail_value > 0 AND enhanced_deduction > 0),

  CONSTRAINT tax_receipts_deduction_ceiling_positive
    CHECK (deduction_ceiling > 0),

  CONSTRAINT tax_receipts_tax_year_plausible
    CHECK (tax_year BETWEEN 2020 AND 2099),

  CONSTRAINT tax_receipts_receipt_number_format
    CHECK (receipt_number ~ '^SR-\d{4}-[A-Z0-9]+$')
);

CREATE INDEX IF NOT EXISTS idx_tax_receipts_donor_id    ON tax_receipts (donor_id);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_tax_year    ON tax_receipts (tax_year);
CREATE INDEX IF NOT EXISTS idx_tax_receipts_issued_at   ON tax_receipts (issued_at DESC);

-- =============================================================================
-- End of schema
-- =============================================================================
