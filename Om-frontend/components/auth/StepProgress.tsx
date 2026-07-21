type StepProgressProps = {
  currentIndex: number;
  total: number;
  label: string;
};

export default function StepProgress({ currentIndex, total, label }: StepProgressProps) {
  const stepNumber = currentIndex + 1;
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-ink/55">
          Step {stepNumber} of {total}
        </span>
        <span className="uppercase tracking-[0.12em] text-burnt">{label}</span>
      </div>
      <div
        role="progressbar"
        aria-label="Signup progress"
        aria-valuenow={stepNumber}
        aria-valuemin={1}
        aria-valuemax={total}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
      >
        <div
          className="h-full rounded-full bg-burnt transition-all duration-500 ease-out"
          style={{ width: `${(stepNumber / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
