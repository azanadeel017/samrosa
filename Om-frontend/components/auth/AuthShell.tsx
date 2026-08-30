import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

export default function AuthShell({
  children,
  cardClassName = "",
}: {
  children: ReactNode;
  cardClassName?: string;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-15%] h-[420px] w-[420px] rounded-full opacity-60 blur-3xl animate-float-slow"
        style={{
          background:
            "radial-gradient(closest-side, rgba(247,169,68,0.45), rgba(247,169,68,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-[-12%] h-[380px] w-[380px] rounded-full opacity-50 blur-3xl animate-float-slow"
        style={{
          background:
            "radial-gradient(closest-side, rgba(204,90,63,0.30), rgba(204,90,63,0) 70%)",
          animationDelay: "-6s",
        }}
      />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="px-6 py-6 sm:px-10">
          <Link
            href="/"
            className="group inline-flex w-fit items-center gap-2"
            aria-label="Samrosa home"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-burnt transition-transform duration-300 group-hover:scale-125"
            />
            <span className="font-display text-xl font-medium tracking-tightest text-ink">
              samrosa
            </span>
          </Link>
        </header>

        <main
          id="main"
          className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 sm:px-10"
        >
          <div className="w-full max-w-md">
            <Reveal>
              <div
                className={`rounded-3xl border border-ink/8 bg-white/80 p-7 shadow-raised backdrop-blur sm:p-10 ${cardClassName}`}
              >
                {children}
              </div>
            </Reveal>
          </div>
        </main>
      </div>
    </div>
  );
}
