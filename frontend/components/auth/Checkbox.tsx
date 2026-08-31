import type { ReactNode } from "react";
import { AlertIcon, CheckIcon } from "./icons";

type CheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
  required?: boolean;
};

export default function Checkbox({
  id,
  checked,
  onChange,
  children,
  error,
  required,
}: CheckboxProps) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 select-none">
        <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burnt ${
              error
                ? "border-error"
                : checked
                ? "border-burnt bg-burnt"
                : "border-ink/25 bg-white/80"
            }`}
          >
            {checked && <CheckIcon className="h-3.5 w-3.5 text-cream" strokeWidth={2.25} />}
          </span>
        </span>
        <span className="pt-2.5 text-sm leading-relaxed text-ink/80">{children}</span>
      </label>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 flex items-center gap-1.5 pl-11 text-sm text-error"
        >
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
