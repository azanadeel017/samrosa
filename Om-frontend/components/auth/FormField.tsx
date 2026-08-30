import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { AlertIcon } from "./icons";

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "onChange"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { id, label, error, hint, required, onChange, className = "", ...rest },
  ref
) {
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
      <input
        {...rest}
        ref={ref}
        id={id}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className={`w-full rounded-xl border bg-white/80 px-4 py-3 text-base text-ink placeholder:text-ink/35 transition focus:outline-none focus:ring-2 focus:ring-burnt/40 ${
          error ? "border-error focus:border-error" : "border-ink/15 focus:border-burnt"
        } ${className}`}
      />
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink/55">
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
});

export default FormField;
