import { InfoIcon } from "./icons";

export default function InlineNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-marigold/40 bg-golden/15 px-4 py-3 text-sm leading-relaxed text-ink/80"
    >
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-burnt" />
      <span>{children}</span>
    </div>
  );
}
