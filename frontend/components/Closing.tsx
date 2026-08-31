import Link from "next/link";
import Reveal from "./Reveal";

export default function Closing() {
  return (
    <section
      aria-labelledby="closing-heading"
      className="relative overflow-hidden border-t border-ink/5"
      style={{
        background:
          "linear-gradient(180deg, #FFF8EA 0%, #FEEBC0 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, rgba(247,169,68,0.45), rgba(247,169,68,0) 70%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 py-24 text-center sm:px-10 sm:py-32">
        <Reveal>
          <h2
            id="closing-heading"
            className="font-display text-4xl font-light leading-[1.05] tracking-tightest text-ink text-balance sm:text-6xl"
          >
            One district. One loop.{" "}
            <em className="italic font-normal text-terracotta">
              Every good meal.
            </em>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-ink/70 text-pretty sm:text-xl">
            Samrosa is starting in Middlesex County, NJ. If you cook, receive,
            or drive — we'd love to have you in the loop.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup?role=donor"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-base font-medium text-cream shadow-raised transition hover:bg-burnt"
            >
              Sign up your restaurant
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/signup?role=shelter"
              className="link-underline text-base font-medium text-ink"
            >
              Or bring your shelter on board
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
