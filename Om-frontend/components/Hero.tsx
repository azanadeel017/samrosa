import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section
      id="main"
      className="relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* warm gradient accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] h-[520px] w-[520px] rounded-full blur-3xl opacity-70 animate-float-slow"
        style={{
          background:
            "radial-gradient(closest-side, rgba(247,169,68,0.55), rgba(247,169,68,0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-[-8%] h-[460px] w-[460px] rounded-full blur-3xl opacity-60 animate-float-slow"
        style={{
          background:
            "radial-gradient(closest-side, rgba(204,90,63,0.35), rgba(204,90,63,0) 70%)",
          animationDelay: "-6s",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 sm:px-10 sm:pt-24 lg:pt-32">
        <Reveal>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-3 py-1 text-xs font-medium tracking-wide text-ink/70 backdrop-blur">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-burnt" />
            A pilot in Middlesex County, New Jersey
          </p>
        </Reveal>

        <Reveal delay={80}>
          <h1
            id="hero-heading"
            className="max-w-[18ch] font-display text-5xl font-light leading-[1.02] tracking-tightest text-ink text-balance sm:text-6xl lg:text-[5.5rem]"
          >
            Good food,{" "}
            <em className="italic text-terracotta font-normal">
              moved
            </em>{" "}
            where it's needed.
          </h1>
        </Reveal>

        <Reveal delay={180}>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink/75 text-pretty sm:text-xl">
            Samrosa connects restaurants with surplus food to shelters and soup
            kitchens — coordinated by neighbors who volunteer to drive. No money,
            no middlemen. Just meals moving where they'll do the most good.
          </p>
        </Reveal>

        <Reveal delay={280}>
          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <a
              href="#donors"
              className="inline-flex items-center gap-2 rounded-full bg-burnt px-6 py-3.5 text-base font-medium text-cream shadow-raised transition hover:bg-terracotta focus-visible:outline-offset-4"
            >
              Become a donor
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#how"
              className="link-underline text-base font-medium text-ink hover:text-terracotta"
            >
              See how it works
            </a>
          </div>
        </Reveal>

        <Reveal delay={420}>
          <ul className="mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-4 text-sm text-ink/70 sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Bullet />
              No money changes hands
            </li>
            <li className="flex items-center gap-2">
              <Bullet />
              Restaurant to shelter in hours
            </li>
            <li className="flex items-center gap-2">
              <Bullet />
              Volunteer-driven
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

function Bullet() {
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-marigold"
    />
  );
}
