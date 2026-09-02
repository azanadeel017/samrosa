"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Croissant,
  Leaf,
  UtensilsCrossed,
  Beef,
  Package,
  Send,
  Loader2,
} from "lucide-react";
import NavBar from "@/components/NavBar";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type Preset = {
  id: string;
  name: string;
  category: string;
  unit: string;
  costBasis: number;
  retailValue: number;
};

const CATEGORIES = [
  { value: "BAKERY",         label: "Bakery",         Icon: Croissant },
  { value: "PRODUCE",        label: "Produce",        Icon: Leaf },
  { value: "PREPARED_MEALS", label: "Prepared Meals", Icon: UtensilsCrossed },
  { value: "DAIRY_MEAT",     label: "Dairy / Meat",   Icon: Beef },
  { value: "SHELF_STABLE",   label: "Shelf-Stable",   Icon: Package },
] as const;

const STORE_ID = "28f86d0d-9f36-4b5c-b97c-353a493cd3e9";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function QuickLogPage() {
  const [presets, setPresets]           = useState<Preset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);

  const [category,     setCategory]     = useState("BAKERY");
  const [weight,       setWeight]       = useState("");
  const [costBasis,    setCostBasis]    = useState("");
  const [retailValue,  setRetailValue]  = useState("");
  const [description,  setDescription]  = useState("");
  const [submitting,   setSubmitting]   = useState(false);

  /* ─── Fetch presets from API ──────────────────────────────────────────────── */

  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/presets/${STORE_ID}`);
        const json = await res.json();
        if (json.success) setPresets(json.data);
      } catch (err) {
        console.error("[log] presets fetch error:", err);
      } finally {
        setPresetsLoading(false);
      }
    }
    loadPresets();
  }, []);

  /* ─── Preset selection ────────────────────────────────────────────────────── */

  function selectPreset(p: Preset) {
    setActivePreset(p);
    setCategory(p.category);
    setCostBasis(p.costBasis.toFixed(2));
    setRetailValue(p.retailValue.toFixed(2));
    setDescription(p.name);
  }

  /* ─── Submit ──────────────────────────────────────────────────────────────── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const w = parseFloat(weight);
    const c = parseFloat(costBasis);
    const r = parseFloat(retailValue);

    if (!Number.isFinite(w) || w <= 0) { toast.error("Enter a valid weight > 0."); return; }
    if (!Number.isFinite(c) || c < 0)  { toast.error("Enter a valid cost basis ≥ $0."); return; }
    if (!Number.isFinite(r) || r <= 0) { toast.error("Enter a valid retail value > $0."); return; }
    if (c > r) { toast.error("Cost basis cannot exceed retail value."); return; }
    if (!description.trim() || description.trim().length < 3) {
      toast.error("Description must be at least 3 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/donations/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donor_id:         STORE_ID,
          description:      description.trim(),
          classification:   category,
          total_weight_lbs: w,
          cost_basis:       c,
          retail_value:     r,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const deduction = Number(data.enhanced_deduction || 0).toFixed(2);
        toast.success(`Donation logged! Est. deduction: $${deduction}`);
        setWeight("");
        setCostBasis(activePreset ? activePreset.costBasis.toFixed(2) : "");
        setRetailValue(activePreset ? activePreset.retailValue.toFixed(2) : "");
        if (!activePreset) setDescription("");
      } else {
        toast.error(data.error || data.details?.join("; ") || "Submission failed.");
      }
    } catch (err) {
      console.error("[log] submit error:", err);
      toast.error("Network error — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  const catIcon = (cat: string) => {
    const match = CATEGORIES.find((c) => c.value === cat);
    if (!match) return <Package size={14} />;
    const Icon = match.Icon;
    return <Icon size={14} />;
  };

  return (
    <>
      <NavBar />

      <main id="main" className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-3xl font-bold tracking-tightest text-ink">
          Quick Log
        </h1>
        <p className="mt-1 text-sm text-ink/65">
          Tap a preset, enter the weight, and submit in 5 seconds.
        </p>

        {/* Preset quick-buttons */}
        {presetsLoading ? (
          <div className="mt-6 flex justify-center py-4">
            <Loader2 size={20} className="animate-spin text-ink/30" />
          </div>
        ) : presets.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink/50">
              Your Presets
            </h2>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => {
                const isActive = activePreset?.id === p.id;
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => selectPreset(p)}
                    whileTap={{ scale: 0.95 }}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-burnt bg-burnt text-cream shadow-soft"
                        : "border-ink/12 bg-white text-ink hover:border-burnt/40 hover:bg-burnt/5"
                    }`}
                  >
                    {catIcon(p.category)}
                    {p.name}
                  </motion.button>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-white/50 px-6 py-6 text-center">
            <p className="text-sm text-ink/40">
              No presets saved yet.{" "}
              <a href="/items" className="link-underline font-medium text-burnt">
                Create one →
              </a>
            </p>
          </div>
        )}

        {/* Manual form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-ink/8 bg-white/80 p-6 shadow-soft backdrop-blur"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm text-ink focus:border-burnt focus:ring-1 focus:ring-burnt/30"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Weight / Quantity ({activePreset?.unit || "lbs"})
              </label>
              <input
                type="number"
                min="0.01"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 15"
                autoFocus
                className="w-full rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-burnt focus:ring-1 focus:ring-burnt/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Cost Basis ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costBasis}
                onChange={(e) => setCostBasis(e.target.value)}
                placeholder="15.00"
                className="w-full rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-burnt focus:ring-1 focus:ring-burnt/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Retail Value ($)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={retailValue}
                onChange={(e) => setRetailValue(e.target.value)}
                placeholder="35.00"
                className="w-full rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-burnt focus:ring-1 focus:ring-burnt/30"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Surplus bakery items, end of day"
                className="w-full rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-burnt focus:ring-1 focus:ring-burnt/30"
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={submitting}
            whileTap={{ scale: submitting ? 1 : 0.97 }}
            whileHover={{ scale: submitting ? 1 : 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-burnt py-4 text-lg font-semibold text-cream shadow-raised transition-colors hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            {submitting ? "Logging…" : "Submit Batch"}
          </motion.button>
        </form>
      </main>
    </>
  );
}
