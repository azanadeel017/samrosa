import type { ReactNode } from "react";
import { InfoIcon } from "./icons";

export default function PlaceholderCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-marigold/50 bg-golden/10 p-6">
      <div className="flex items-center gap-2">
        <InfoIcon className="h-4 w-4 text-burnt" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-burnt">
          To be finalized
        </span>
      </div>
      <h3 className="mt-3 font-display text-xl font-medium leading-snug text-ink">
        {title}
      </h3>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink/70">{children}</div>
    </div>
  );
}
