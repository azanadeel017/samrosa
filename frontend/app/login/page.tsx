"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import AuthShell from "@/components/auth/AuthShell";
import FormField from "@/components/auth/FormField";
import PasswordField from "@/components/auth/PasswordField";
import InlineNotice from "@/components/auth/InlineNotice";
import { isValidEmail } from "@/components/auth/validation";
import { useAuth } from "@/context/AuthContext";

type Errors = { email?: string; password?: string };

export default function LoginPage() {
  const router = useRouter();
  const { login, user, storeId, setDemoSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotNote, setShowForgotNote] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  // If already logged in, navigate to dashboard
  useEffect(() => {
    if (user && storeId) {
      router.replace("/dashboard");
    }
  }, [user, storeId, router]);

  function validate(): Errors {
    const next: Errors = {};
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    return next;
  }

  function handleBlur(field: "email" | "password") {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const next = validate();
    setErrors(next);
    setTouched({ email: true, password: true });
    if (next.email) {
      emailRef.current?.focus();
      return;
    }
    if (Object.keys(next).length > 0) return;

    setStatus("loading");
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success("Welcome back!");
        router.push("/dashboard");
      } else {
        setErrorMessage(result.error || "Invalid email or password.");
        toast.error(result.error || "Invalid email or password.");
        setStatus("idle");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Login failed. Please try again.");
      toast.error("Login failed. Please try again.");
      setStatus("idle");
    }
  }

  function handleDemoLogin() {
    setDemoSession();
    toast.success("Signed in with Demo Store!");
    router.push("/dashboard");
  }

  return (
    <AuthShell>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-burnt">
        Welcome back
      </p>
      <h1 className="mt-3 font-display text-3xl font-light leading-tight tracking-tightest text-ink">
        Log in to Samrosa
      </h1>
      <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink/65">
        Restaurants, shelters, and drivers all sign in here.
      </p>

      {errorMessage && (
        <div className="mt-4">
          <InlineNotice>{errorMessage}</InlineNotice>
        </div>
      )}

      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmit={handleSubmit}
      >
        <FormField
          ref={emailRef}
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (touched.email) setErrors(validate());
          }}
          onBlur={() => handleBlur("email")}
          error={touched.email ? errors.email : undefined}
        />

        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (touched.password) setErrors(validate());
          }}
          onBlur={() => handleBlur("password")}
          error={touched.password ? errors.password : undefined}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-ink/75">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-ink/25 text-burnt accent-burnt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setShowForgotNote(true)}
            className="link-underline min-h-11 font-medium text-terracotta"
          >
            Forgot password?
          </button>
        </div>

        {showForgotNote && (
          <InlineNotice>Password reset isn&rsquo;t available yet — please contact pilot support.</InlineNotice>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-burnt px-6 py-3.5 text-base font-medium text-cream shadow-raised transition hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"
            />
          )}
          {status === "loading" ? "Logging in…" : "Log in"}
        </button>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full rounded-full border border-ink/15 bg-white/70 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-burnt/5 hover:text-burnt hover:border-burnt/40"
          >
            Sign in as Demo Store
          </button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-ink/65">
        Don&rsquo;t have an account?{" "}
        <Link href="/signup" className="link-underline font-medium text-ink">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
