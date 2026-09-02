"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Croissant,
  Leaf,
  UtensilsCrossed,
  Beef,
  Package,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import NavBar from "@/components/NavBar";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type Preset = {
  id: string;
  storeId: string;
  name: string;
  category: "BAKERY" | "PRODUCE" | "PREPARED_MEALS" | "DAIRY_MEAT" | "SHELF_STABLE";
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

export default function ItemPresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName]             = useState("");
  const [category, setCategory]     = useState<Preset["category"]>("BAKERY");
  const [unit, setUnit]             = useState("lbs");
  const [costBasis, setCostBasis]   = useState("");
  const [retailValue, setRetailValue] = useState("");

  /* ─── Fetch presets from API ──────────────────────────────────────────────── */

  const loadPresets = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/presets/${STORE_ID}`);
      const json = await res.json();
      if (json.success) setPresets(json.data);
    } catch (err) {
      console.error("[items] fetch error:", err);
      toast.error("Could not load presets from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  /* ─── Add preset via API ──────────────────────────────────────────────────── */

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) { toast.error("Item name is required."); return; }
    const cost   = parseFloat(costBasis);
    const retail = parseFloat(retailValue);
    if (!Number.isFinite(cost) || cost < 0)    { toast.error("Enter a valid cost basis (≥ $0)."); return; }
    if (!Number.isFinite(retail) || retail <= 0) { toast.error("Enter a valid retail value (> $0)."); return; }
    if (cost > retail) { toast.error("Cost basis cannot exceed retail value."); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id:     STORE_ID,
          name:         name.trim(),
          category,
          unit:         unit.trim() || "lbs",
          cost_basis:   cost,
          retail_value: retail,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(`"${name.trim()}" saved!`);
        setPresets((prev) => [json.data, ...prev]);
        setName(""); setCostBasis(""); setRetailValue(""); setUnit("lbs");
      } else {
        toast.error(json.error || json.details?.join("; ") || "Save failed.");
      }
    } catch {
      toast.error("Network error — is the backend running?");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Delete preset via API ───────────────────────────────────────────────── */

  async function handleDelete(id: string, itemName: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/presets/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (res.ok && json.success) {
        setPresets((prev) => prev.filter((p) => p.id !== id));
        toast.success(`"${itemName}" deleted`);
      } else {
        toast.error(json.error || "Delete failed.");
      }
    } catch {
      toast.error("Network error — could not delete.");
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

      <main id="main" className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-display text-3xl font-bold tracking-tightest text-ink">
          Item Presets
        </h1>
        <p className="mt-1 text-sm text-ink/65">
          Save items once, quick-log every shift. Synced across all devices.
        </p>

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="mt-8 rounded-2xl border border-ink/8 bg-white/80 p-6 shadow-soft backdrop-blur"
        >
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            Add New Preset
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

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

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-burnt px-6 py-2.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-terracotta disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {saving ? "Saving…" : "Add Preset"}
              </button>
            </div>
          </div>
        </form>

        {/* Preset grid */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            Saved Presets
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-ink/40" />
            </div>
          ) : presets.length === 0 ? (
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
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-marigold/20 px-3 py-0.5 text-xs font-medium text-marigold">
                        {catIcon(p.category)} {p.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.name)}
                      className="rounded-lg p-1.5 text-ink/30 opacity-0 transition group-hover:opacity-100 hover:bg-error/10 hover:text-error"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 size={14} />
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
