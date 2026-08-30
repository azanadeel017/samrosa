import type { ReactNode } from "react";
import { CheckIcon } from "./icons";

type RoleCardProps = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  selected: boolean;
  onSelect: () => void;
};

export default function RoleCard({
  id,
  title,
  description,
  icon,
  selected,
  onSelect,
}: RoleCardProps) {
  return (
    <button
      type="button"
      id={id}
      aria-pressed={selected}
      onClick={onSelect}
      className={`group flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt ${
        selected
          ? "border-burnt bg-burnt/[0.06] shadow-soft"
          : "border-ink/10 bg-white/70 hover:border-burnt/40 hover:bg-white"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
          selected ? "bg-burnt text-cream" : "bg-cream text-burnt"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 pt-0.5">
        <span className="block font-display text-lg font-medium leading-snug text-ink">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-ink/65">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
          selected ? "border-burnt bg-burnt" : "border-ink/20"
        }`}
      >
        {selected && <CheckIcon className="h-3 w-3 text-cream" strokeWidth={2.25} />}
      </span>
    </button>
  );
}
