"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type Preset = {
  id: string;
  name: string;
  category: "BAKERY" | "PRODUCE" | "PREPARED_MEALS" | "DAIRY_MEAT" | "SHELF_STABLE";
  unit: string;
  costBasis: number;
  retailValue: number;
};

const CATEGORIES = [
  { value: "BAKERY", label: "Bakery", emoji: "🥖" },
  { value: "PRODUCE", label: "Produce", emoji: "🥦" },
  { value: "PREPARED_MEALS", label: "Prepared Meals", emoji: "🍱" },
  { value: "DAIRY_MEAT", label: "Dairy / Meat", emoji: "🥩" },
  { value: "SHELF_STABLE", label: "Shelf-Stable", emoji: "🥫" },
] as const;

const LS_KEY = "samrosa_item_presets";

/* ─── Persistence ───────────────────────────────────────────────────────────── */

function loadPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePresets(presets: Preset[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(presets));
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function ItemPresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Preset["category"]>("BAKERY");
  const [unit, setUnit] = useState("lbs");
  const [costBasis, setCostBasis] = useState("");
  const [retailValue, setRetailValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const persist = useCallback((next: Preset[]) => {
    setPresets(next);
    savePresets(next);
  }, []);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Item name is required.");
      return;
    }
    const cost = parseFloat(costBasis);
    const retail = parseFloat(retailValue);
    if (!Number.isFinite(cost) || cost < 0) {
      setFormError("Enter a valid cost basis (≥ $0).");
      return;
    }
    if (!Number.isFinite(retail) || retail <= 0) {
      setFormError("Enter a valid retail value (> $0).");
      return;
    }
    if (cost > retail) {
      setFormError("Cost basis cannot exceed retail value.");
      return;
    }

    const preset: Preset = {
      id: crypto.randomUUID(),
      name: name.trim(),
      category,
      unit: unit.trim() || "lbs",
      costBasis: cost,
      retailValue: retail,
    };

    persist([preset, ...presets]);
    setName("");
    setCostBasis("");
    setRetailValue("");
    setUnit("lbs");
  }

  function handleDelete(id: string) {
    persist(presets.filter((p) => p.id !== id));
  }

  const catEmoji = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.emoji || "📦";

  return (
    <>
      <NavBar />

      <main id="main" className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-display text-3xl font-bold tracking-tightest text-ink">
          Item Presets
        </h1>
        <p className="mt-1 text-sm text-ink/65">
          Save items once, quick-log every shift.
        </p>

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="mt-8 rounded-2xl border border-ink/8 bg-white/80 p-6 shadow-soft backdrop-blur"
        >
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            Add New Preset
          </h2>

          {formError && (
            <div className="mb-4 rounded-xl bg-error/10 px-4 py-2.5 text-sm text-error">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Name */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Item Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Catering Samosa Tray"
                className="w-full rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-burnt focus:ring-1 focus:ring-burnt/30"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Preset["category"])}
                className="w-full rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm text-ink focus:border-burnt focus:ring-1 focus:ring-burnt/30"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Default Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="lbs"
                className="w-full rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-burnt focus:ring-1 focus:ring-burnt/30"
              />
            </div>

            {/* Cost Basis */}
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

            {/* Retail Value */}
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

            {/* Submit */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-full bg-burnt px-6 py-2.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-terracotta"
              >
                + Add Preset
              </button>
            </div>
          </div>
        </form>

        {/* Preset grid */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            Saved Presets
          </h2>

          {presets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/15 bg-white/50 px-6 py-12 text-center">
              <p className="text-sm text-ink/40">
                No presets yet — add your first item above
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="group relative rounded-2xl border border-ink/8 bg-white/80 p-5 shadow-soft backdrop-blur transition hover:shadow-raised"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-ink">{p.name}</p>
                      <span className="mt-1 inline-block rounded-full bg-marigold/20 px-3 py-0.5 text-xs font-medium text-marigold">
                        {catEmoji(p.category)} {p.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="rounded-lg p-1.5 text-ink/30 opacity-0 transition group-hover:opacity-100 hover:bg-error/10 hover:text-error"
                      aria-label={`Delete ${p.name}`}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm text-ink/60">
                    <span>Unit: <strong className="text-ink">{p.unit}</strong></span>
                    <span>Cost: <strong className="text-ink">${p.costBasis.toFixed(2)}</strong></span>
                    <span>Retail: <strong className="text-ink">${p.retailValue.toFixed(2)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
