"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Scale,
  Utensils,
  BadgeDollarSign,
  Wind,
  FlaskConical,
} from "lucide-react";
import NavBar from "@/components/NavBar";

const WasteChart = dynamic(() => import("@/components/WasteChart"), { ssr: false });

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type Donation = {
  id: string;
  classification: string;
  weight_lbs: number;
  cost_basis: number;
  retail_value: number;
  tax_deduction_usd: number;
  co2e_kg: number;
  methane_kg: number;
  meals_equivalent: number;
  recipient_name: string;
  date: string;
};

type Metrics = {
  totalRescuedWeightLbs: number;
  totalTaxDeductionValue: number;
  totalAvoidedCO2eKg: number;
  totalMethaneAvoidedKg: number;
  totalMealsEquivalent: number;
  recentDonations: Donation[];
};

const STORE_ID = "28f86d0d-9f36-4b5c-b97c-353a493cd3e9";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function safe(val: unknown, decimals = 0): string {
  const n = Number(val || 0);
  return Number.isFinite(n) ? n.toFixed(decimals) : "0";
}

function fmtUsd(val: unknown): string {
  const n = Number(val || 0);
  if (!Number.isFinite(n)) return "$0.00";
  return (
    "$" +
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtNum(val: unknown): string {
  const n = Number(val || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function prettyCategory(raw: string): string {
  return (raw || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── CSV Export ─────────────────────────────────────────────────────────────── */

function downloadCsv(donations: Donation[]) {
  const headers = [
    "Donation ID",
    "Date",
    "Category",
    "Weight (lbs)",
    "Cost Basis ($)",
    "Retail Value ($)",
    "Est. §170(e)(3) Deduction ($)",
    "CO2e Avoided (kg)",
    "Methane Offset (kg)",
    "Meals Equivalent",
    "Recipient Organization (501c3)",
  ];
  const rows = donations.map((d) => [
    d.id,
    d.date ? new Date(d.date).toLocaleDateString() : "N/A",
    d.classification,
    safe(d.weight_lbs, 1),
    safe(d.cost_basis, 2),
    safe(d.retail_value, 2),
    safe(d.tax_deduction_usd, 2),
    safe(d.co2e_kg, 2),
    safe(d.methane_kg, 2),
    safe(d.meals_equivalent),
    d.recipient_name || "N/A",
  ]);
  const disclaimer = [
    "",
    "DISCLAIMER: Estimates provided for documentation and tax professional review. Final determinations made by the merchant's licensed CPA.",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    disclaimer.join(","),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `samrosa_esg_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Animation variants ─────────────────────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/metrics/summary/${STORE_ID}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setMetrics(json.data);
      } catch (err) {
        console.error("[dashboard] fetch error:", err);
        setError("Backend offline — metrics unavailable");
        toast.error("Could not connect to backend API");
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  const handleExport = useCallback(() => {
    if (metrics?.recentDonations) {
      downloadCsv(metrics.recentDonations);
      toast.success("CSV exported!");
    }
  }, [metrics]);

  /* ─── Metric card config ──────────────────────────────────────────────────── */
  const cards = metrics
    ? [
        {
          label: "Rescued Weight",
          value: `${fmtNum(metrics.totalRescuedWeightLbs)} lbs`,
          icon: Scale,
          accent: false,
        },
        {
          label: "Meals Rescued",
          value: fmtNum(metrics.totalMealsEquivalent),
          icon: Utensils,
          accent: false,
        },
        {
          label: "Est. §170(e)(3) Deduction",
          value: fmtUsd(metrics.totalTaxDeductionValue),
          icon: BadgeDollarSign,
          accent: true,
        },
        {
          label: "CO₂e Avoided",
          value: `${fmtNum(Math.round(Number(metrics.totalAvoidedCO2eKg || 0)))} kg`,
          icon: Wind,
          accent: false,
        },
        {
          label: "Methane Offset",
          value: `${fmtNum(Math.round(Number(metrics.totalMethaneAvoidedKg || 0)))} kg`,
          icon: FlaskConical,
          accent: false,
        },
      ]
    : [];

  return (
    <>
      <NavBar
        onExport={metrics?.recentDonations?.length ? handleExport : undefined}
      />

      <main id="main" className="mx-auto max-w-6xl px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tightest text-ink">
            ESG &amp; Tax Analytics
          </h1>
          <p className="mt-1 text-sm text-ink/65">
            Real-time rescue and impact metrics · EPA WARM v15-Aligned
          </p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-ink/8 bg-white/60 p-5"
              >
                <div className="mb-3 h-3 w-20 rounded bg-ink/10" />
                <div className="h-7 w-24 rounded bg-ink/10" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl bg-burnt/10 px-6 py-4 text-center">
            <p className="text-sm font-medium text-burnt">{error}</p>
            <p className="mt-1 text-xs text-ink/50">
              Make sure the Express backend is running on port 5000.
            </p>
          </div>
        )}

        {/* Metric cards — stagger-fade in */}
        {metrics && (
          <>
            <motion.div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.label}
                    variants={cardVariants}
                    className="rounded-2xl border border-ink/8 bg-white/80 p-5 shadow-soft backdrop-blur"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Icon
                        size={16}
                        className={card.accent ? "text-burnt" : "text-ink/40"}
                      />
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">
                        {card.label}
                      </p>
                    </div>
                    <p
                      className={`text-2xl font-bold ${
                        card.accent ? "text-burnt" : "text-ink"
                      }`}
                    >
                      {card.value}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Weekly Bar Chart */}
            <WasteChart />

            {/* Transaction table */}
            <section className="mt-10">
              <h2 className="mb-4 font-display text-xl font-semibold text-ink">
                Recent Transactions
              </h2>

              <div className="overflow-hidden rounded-2xl border border-ink/8 bg-white/80 backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink/8 bg-ink/[0.02]">
                        <th className="px-5 py-3 font-semibold text-ink/50">Date</th>
                        <th className="px-5 py-3 font-semibold text-ink/50">Category</th>
                        <th className="px-5 py-3 text-right font-semibold text-ink/50">Weight (lbs)</th>
                        <th className="px-5 py-3 text-right font-semibold text-ink/50">Deduction ($)</th>
                        <th className="px-5 py-3 text-right font-semibold text-ink/50">CO₂e (kg)</th>
                        <th className="px-5 py-3 font-semibold text-ink/50">Recipient</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/5">
                      {metrics.recentDonations?.length ? (
                        metrics.recentDonations.map((tx) => (
                          <tr
                            key={tx.id}
                            className="transition-colors hover:bg-ink/[0.03]"
                          >
                            <td className="px-5 py-3 text-ink/70">
                              {tx.date
                                ? new Date(tx.date).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-5 py-3 font-medium text-ink">
                              {prettyCategory(tx.classification)}
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-ink">
                              {safe(tx.weight_lbs, 1)}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-burnt">
                              {fmtUsd(tx.tax_deduction_usd)}
                            </td>
                            <td className="px-5 py-3 text-right text-ink/70">
                              {safe(tx.co2e_kg, 1)}
                            </td>
                            <td className="px-5 py-3 text-ink/70">
                              {tx.recipient_name || "N/A"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-8 text-center text-sm text-ink/40"
                          >
                            No recent transactions
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="mt-3 text-xs text-ink/40">
                Estimates provided for documentation and tax professional review.
                Final determinations made by the merchant&apos;s licensed CPA.
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
