"use client";

import { useId, useState } from "react";
import { AlertIcon, EyeIcon, EyeOffIcon } from "./icons";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
};

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  required,
  autoComplete = "new-password",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && (
          <>
            <span aria-hidden className="ml-0.5 text-burnt">
              *
            </span>
            <span className="sr-only"> required</span>
          </>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? hintId : undefined}
          className={`w-full rounded-xl border bg-white/80 py-3 pl-4 pr-12 text-base text-ink transition focus:outline-none focus:ring-2 focus:ring-burnt/40 ${
            error ? "border-error focus:border-error" : "border-ink/15 focus:border-burnt"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink/45 transition hover:bg-ink/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-burnt"
        >
          {visible ? (
            <EyeOffIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      {!error && hint && (
        <p id={hintId} className="mt-1.5 text-xs text-ink/55">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-sm text-error"
        >
          <AlertIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
