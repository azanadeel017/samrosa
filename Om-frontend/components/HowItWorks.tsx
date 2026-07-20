import Reveal from "./Reveal";

const steps = [
  {
    n: "01",
    title: "A restaurant posts",
    body: "Kitchens log surplus in under a minute — food type, quantity, allergens, temperature, safe-until time.",
  },
  {
    n: "02",
    title: "A shelter claims it",
    body: "Nearby shelters browse and claim what fits their kitchen and their guests.",
  },
  {
    n: "03",
    title: "A pickup opens",
    body: "A driver slot appears, sized to the donation. One trip, one route, a real neighbor at the wheel.",
  },
  {
    n: "04",
    title: "Someone drives",
    body: "Volunteers register under a pickup, mark it picked up, then delivered — right from their phone.",
  },
  {
    n: "05",
    title: "A meal is served",
    body: "Food arrives while it's still good. Volunteer hours update automatically on drop-off.",
  },
  {
    n: "06",
    title: "The impact is logged",
    body: "Every donation adds to totals we can share, export, and use to keep the loop running.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how"
      className="relative border-t border-ink/5 bg-cream/50 py-24 sm:py-32"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-burnt">
            How it works
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2
            id="how-heading"
            className="mt-4 max-w-2xl font-display text-4xl font-light leading-[1.05] tracking-tightest text-ink text-balance sm:text-5xl"
          >
            Six small steps.{" "}
            <em className="italic font-normal text-terracotta">
              One good meal.
            </em>
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">
            The lifecycle is deliberately short. Each stage is a signal, not a
            form — because the food doesn't wait.
          </p>
        </Reveal>

        <ol className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={80 * (i + 1)}>
              <li className="group relative flex h-full flex-col rounded-2xl border border-ink/8 bg-white/70 p-7 shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:shadow-raised">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl font-light text-marigold">
                    {step.n}
                  </span>
                  <span
                    aria-hidden
                    className="h-px w-8 origin-right scale-x-100 bg-ink/20 transition-transform duration-500 group-hover:scale-x-[2]"
                  />
                </div>
                <h3 className="mt-5 font-display text-2xl font-normal leading-snug text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/70 text-pretty">
                  {step.body}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
