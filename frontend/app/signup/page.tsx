"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import AuthShell from "@/components/auth/AuthShell";
import FormField from "@/components/auth/FormField";
import PasswordField from "@/components/auth/PasswordField";
import Checkbox from "@/components/auth/Checkbox";
import RoleCard from "@/components/auth/RoleCard";
import StepProgress from "@/components/auth/StepProgress";
import PlaceholderCard from "@/components/auth/PlaceholderCard";
import {
  AlertIcon,
  BowlIcon,
  CarIcon,
  CheckIcon,
  ChevronLeftIcon,
  HouseHeartIcon,
  UploadIcon,
} from "@/components/auth/icons";
import { isValidEmail, isValidPassword } from "@/components/auth/validation";
import { useAuth } from "@/context/AuthContext";

type Role = "donor" | "shelter" | "driver";
type StepId = "role" | "account" | "identity" | "details" | "terms";
type AccountField = "businessName" | "fullName" | "email" | "password" | "confirmPassword";
type AccountErrors = Partial<Record<AccountField, string>>;

const ROLE_INFO: Record<
  Role,
  { title: string; description: string; icon: ReactNode; noun: string }
> = {
  donor: {
    title: "Restaurant / Donor",
    description: "Post surplus food for shelters to claim.",
    icon: <BowlIcon className="h-5 w-5" />,
    noun: "restaurant",
  },
  shelter: {
    title: "Shelter",
    description: "Claim listings and receive donated food.",
    icon: <HouseHeartIcon className="h-5 w-5" />,
    noun: "shelter",
  },
  driver: {
    title: "Driver / Volunteer",
    description: "Pick up and deliver food between donors and shelters.",
    icon: <CarIcon className="h-5 w-5" />,
    noun: "driver",
  },
};

const STEP_LABELS: Record<StepId, string> = {
  role: "Role",
  account: "Account",
  identity: "Verify",
  details: "Details",
  terms: "Terms",
};

function stepsForRole(role: Role | null): StepId[] {
  const all: StepId[] = ["role", "account", "identity", "details", "terms"];
  return role === "driver" ? all.filter((s) => s !== "identity") : all;
}

function stepHeading(step: StepId, role: Role | null) {
  switch (step) {
    case "role":
      return {
        title: "Choose your role",
        subtitle: "Pick the account type that matches how you'll use Samrosa.",
      };
    case "account":
      return {
        title: "Create your account",
        subtitle: "We'll use this to sign you in and set up your organization.",
      };
    case "identity":
      return {
        title: "Identity confirmation",
        subtitle: `Required for ${role ? ROLE_INFO[role].noun : "donor and shelter"} accounts before your account is activated.`,
      };
    case "details":
      return {
        title: role && role !== "driver" ? `Tell us about your ${ROLE_INFO[role].noun}` : "Tell us more about you",
        subtitle: "A few more details, specific to your role.",
      };
    case "terms":
      return {
        title: "Terms & liability",
        subtitle: "Review and accept to finish creating your account.",
      };
  }
}

function isRole(value: string | null): value is Role {
  return value === "donor" || value === "shelter" || value === "driver";
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const preselectedRole = isRole(roleParam) ? roleParam : null;

  const { signup, user, storeId } = useAuth();

  const [role, setRole] = useState<Role | null>(preselectedRole);
  const [roleError, setRoleError] = useState<string | undefined>();
  const [stepIndex, setStepIndex] = useState(preselectedRole ? 1 : 0);

  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [accountTouched, setAccountTouched] = useState<Partial<Record<AccountField, boolean>>>({});

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>();

  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "done">("idle");
  const [signupError, setSignupError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);

  const steps = stepsForRole(role);
  const currentStep = steps[stepIndex];

  // Redirect if logged in
  useEffect(() => {
    if (user && storeId && submitStatus !== "loading") {
      router.replace("/dashboard");
    }
  }, [user, storeId, router, submitStatus]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  function validateAccount(): AccountErrors {
    const next: AccountErrors = {};
    if (role === "donor" || role === "shelter") {
      if (!businessName.trim()) next.businessName = `Enter your ${ROLE_INFO[role].noun} or business name.`;
    }
    if (!fullName.trim()) next.fullName = "Enter your full name.";
    if (!email.trim()) next.email = "Enter your email address.";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Create a password.";
    else if (!isValidPassword(password)) next.password = "Use at least 8 characters.";
    if (!confirmPassword) next.confirmPassword = "Confirm your password.";
    else if (confirmPassword !== password) next.confirmPassword = "Passwords don't match.";
    return next;
  }

  function touchAccount(field: AccountField) {
    setAccountTouched((t) => ({ ...t, [field]: true }));
    setAccountErrors(validateAccount());
  }

  async function handleSubmit() {
    setSubmitStatus("loading");
    setSignupError(null);

    try {
      const bName = (businessName.trim() || fullName.trim() || "My Store");
      const res = await signup({
        email,
        password,
        businessName: bName,
        fullName,
        role: role || "donor",
      });

      if (res.success) {
        setSubmitStatus("done");
        toast.success("Account created successfully!");
      } else {
        setSubmitStatus("idle");
        setSignupError(res.error || "Failed to create account.");
        toast.error(res.error || "Failed to create account.");
      }
    } catch (err: any) {
      setSubmitStatus("idle");
      setSignupError(err?.message || "An error occurred during account creation.");
      toast.error("An error occurred during account creation.");
    }
  }

  function goNext() {
    if (currentStep === "role") {
      if (!role) {
        setRoleError("Choose a role to continue.");
        return;
      }
    }

    if (currentStep === "account") {
      const errs = validateAccount();
      setAccountErrors(errs);
      setAccountTouched({
        businessName: true,
        fullName: true,
        email: true,
        password: true,
        confirmPassword: true,
      });
      if (Object.keys(errs).length > 0) return;
    }

    if (currentStep === "terms") {
      if (!termsAccepted) {
        setTermsError("You need to accept the terms to continue.");
        return;
      }
      handleSubmit();
      return;
    }

    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  if (submitStatus === "done") {
    return (
      <AuthShell>
        <div className="py-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-burnt/10 text-burnt">
            <CheckIcon className="h-7 w-7" strokeWidth={2} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-medium text-ink">
            Account Created!
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/70">
            Welcome to Samrosa{fullName.trim() ? `, ${fullName.trim().split(" ")[0]}` : ""}.
            Your {role ? ROLE_INFO[role].noun : "store"} is registered and ready for pilot operations.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-burnt px-6 py-3.5 text-base font-medium text-cream shadow-raised transition hover:bg-terracotta"
          >
            Go to Dashboard
          </Link>
        </div>
      </AuthShell>
    );
  }

  const heading = stepHeading(currentStep, role);

  return (
    <AuthShell>
      <StepProgress currentIndex={stepIndex} total={steps.length} label={STEP_LABELS[currentStep]} />

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-2xl font-light leading-tight tracking-tightest text-ink outline-none sm:text-3xl"
      >
        {heading.title}
      </h1>
      <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink/65">{heading.subtitle}</p>

      {signupError && (
        <div className="mt-4 rounded-xl bg-error/10 p-3 text-sm text-error">
          {signupError}
        </div>
      )}

      <div className="mt-7">
        {currentStep === "role" && (
          <div>
            <div className="space-y-3" aria-label="Choose your role">
              {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
                <RoleCard
                  key={r}
                  id={`role-${r}`}
                  title={ROLE_INFO[r].title}
                  description={ROLE_INFO[r].description}
                  icon={ROLE_INFO[r].icon}
                  selected={role === r}
                  onSelect={() => {
                    setRole(r);
                    setRoleError(undefined);
                  }}
                />
              ))}
            </div>
            {roleError && (
              <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-error">
                <AlertIcon className="h-3.5 w-3.5 shrink-0" />
                {roleError}
              </p>
            )}
            <p className="mt-5 text-xs leading-relaxed text-ink/50">
              Admin accounts are created by the Samrosa team and aren&rsquo;t available here.
            </p>
          </div>
        )}

        {currentStep === "account" && (
          <div className="space-y-5">
            {(role === "donor" || role === "shelter") && (
              <FormField
                id="businessName"
                label={role === "donor" ? "Restaurant / Business Name" : "Shelter / Org Name"}
                placeholder="e.g. Samrosa Bakery & Deli"
                required
                value={businessName}
                onChange={(v) => {
                  setBusinessName(v);
                  if (accountTouched.businessName) setAccountErrors(validateAccount());
                }}
                onBlur={() => touchAccount("businessName")}
                error={accountTouched.businessName ? accountErrors.businessName : undefined}
              />
            )}
            <FormField
              id="fullName"
              label="Contact person full name"
              autoComplete="name"
              required
              value={fullName}
              onChange={(v) => {
                setFullName(v);
                if (accountTouched.fullName) setAccountErrors(validateAccount());
              }}
              onBlur={() => touchAccount("fullName")}
              error={accountTouched.fullName ? accountErrors.fullName : undefined}
            />
            <FormField
              id="signup-email"
              label="Work email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(v) => {
                setEmail(v);
                if (accountTouched.email) setAccountErrors(validateAccount());
              }}
              onBlur={() => touchAccount("email")}
              error={accountTouched.email ? accountErrors.email : undefined}
            />
            <PasswordField
              id="signup-password"
              label="Password"
              required
              hint={accountErrors.password ? undefined : "At least 8 characters."}
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (accountTouched.password) setAccountErrors(validateAccount());
              }}
              onBlur={() => touchAccount("password")}
              error={accountTouched.password ? accountErrors.password : undefined}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm password"
              required
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                if (accountTouched.confirmPassword) setAccountErrors(validateAccount());
              }}
              onBlur={() => touchAccount("confirmPassword")}
              error={accountTouched.confirmPassword ? accountErrors.confirmPassword : undefined}
            />
          </div>
        )}

        {currentStep === "identity" && role && (
          <div>
            <PlaceholderCard title={`Identity confirmation for your ${ROLE_INFO[role].noun}`}>
              <p>
                Donors and shelters confirm their business registration and food safety compliance.
                During this pilot phase, your account is automatically provisioned for immediate access.
              </p>
            </PlaceholderCard>
            <div
              aria-hidden="true"
              className="mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 bg-white/50 px-6 py-8 text-center opacity-75"
            >
              <UploadIcon className="h-6 w-6 text-burnt" />
              <p className="text-sm font-medium text-ink">Pilot Fast-Track Active</p>
              <p className="text-xs text-ink/50">Verification will be reviewed in the background.</p>
            </div>
          </div>
        )}

        {currentStep === "details" && role && (
          <PlaceholderCard title={`Additional ${ROLE_INFO[role].noun} details`}>
            <p>
              Optional operating hours and pickup instructions will be configured directly in your dashboard.
            </p>
          </PlaceholderCard>
        )}

        {currentStep === "terms" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-ink/10 bg-cream/40 p-5 text-sm leading-relaxed text-ink/75">
              <p>
                By creating an account, you acknowledge Samrosa&rsquo;s donation terms and
                liability waiver. No money changes hands on this platform — donations are made
                in good faith and are protected under the{" "}
                <span className="font-medium text-ink">
                  Bill Emerson Good Samaritan Food Donation Act
                </span>{" "}
                and the <span className="font-medium text-ink">NJ Good Samaritan Act</span>.
              </p>
            </div>
            <Checkbox
              id="terms"
              required
              checked={termsAccepted}
              onChange={(v) => {
                setTermsAccepted(v);
                if (v) setTermsError(undefined);
              }}
              error={termsError}
            >
              I acknowledge the donation terms and liability waiver above.
            </Checkbox>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-ink/70 transition hover:text-ink"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={submitStatus === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-burnt px-6 py-3.5 text-base font-medium text-cream shadow-raised transition hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitStatus === "loading" && (
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"
            />
          )}
          {currentStep === "terms"
            ? submitStatus === "loading"
              ? "Creating account…"
              : "Create account"
            : "Continue"}
        </button>
      </div>

      <p className="mt-8 text-center text-sm text-ink/65">
        Already have an account?{" "}
        <Link href="/login" className="link-underline font-medium text-ink">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
