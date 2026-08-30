import Link from "next/link";
import Reveal from "./Reveal";

type Role = {
  id: string;
  eyebrow: string;
  heading: React.ReactNode;
  body: string;
  bullets: string[];
  cta: string;
  accent: "burnt" | "terracotta" | "marigold";
  swatch: string;
  signupRole: "donor" | "shelter" | "driver";
};

const roles: Role[] = [
  {
    id: "donors",
    eyebrow: "For restaurants",
    heading: (
      <>
        Turn end-of-day surplus into a <em className="italic font-normal">good deed</em>, not a receipt.
      </>
    ),
    body: "Post what's left. A shelter claims it. A volunteer takes it. You get a clean record of what left your kitchen, and nothing lands in the dumpster that didn't have to.",
    bullets: [
      "One-minute posting form",
      "Allergens, temperature, safe-until — all captured",
      "A running count of the meals you've provided",
    ],
    cta: "Become a donor",
    accent: "burnt",
    swatch: "#FEC671",
    signupRole: "donor",
  },
  {
    id: "shelters",
    eyebrow: "For shelters",
    heading: (
      <>
        Kitchens deserve <em className="italic font-normal">predictable</em> help.
      </>
    ),
    body: "Browse open listings from restaurants nearby. Favorite the ones whose food fits your guests, and their listings surface first — no chasing donations across three group chats.",
    bullets: [
      "Claim what you can use, skip what you can't",
      "Favorited donors pin to the top of your feed",
      "History of everything you've received",
    ],
    cta: "Register as a shelter",
    accent: "terracotta",
    swatch: "#FEC671",
    signupRole: "shelter",
  },
  {
    id: "drivers",
    eyebrow: "For volunteers",
    heading: (
      <>
        Drive a mile. Feed a <em className="italic font-normal">neighbor</em>.
      </>
    ),
    body: "One dashboard, one tab: available pickups. Larger donations need more drivers — grab a slot, mark it picked up, mark it delivered. Your hours record updates itself.",
    bullets: [
      "Sessions sized to the donation",
      "Pick-up and drop-off in two taps",
      "Automatic volunteer-hours tally",
    ],
    cta: "Volunteer as a driver",
    accent: "terracotta",
    swatch: "#FEC671",
    signupRole: "driver",
  },
];

const accentText: Record<Role["accent"], string> = {
  burnt: "text-burnt",
  terracotta: "text-terracotta",
  marigold: "text-marigold",
};

const accentBg: Record<Role["accent"], string> = {
  burnt: "bg-burnt hover:bg-terracotta",
  terracotta: "bg-terracotta hover:bg-burnt",
  marigold: "bg-marigold hover:bg-burnt",
};

export default function Roles() {
  return (
    <section
      aria-label="For donors, shelters, and volunteers"
      className="relative py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="flex flex-col gap-24 sm:gap-32">
          {roles.map((r, i) => (
            <div
              key={r.id}
              id={r.id}
              className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16"
            >
              <Reveal
                className={
                  i % 2 === 1
                    ? "lg:col-span-5 lg:col-start-8 lg:row-start-1"
                    : "lg:col-span-5 lg:col-start-1 lg:row-start-1"
                }
              >
                <div
                  className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-ink/5 shadow-soft"
                  style={{ background: r.swatch }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(80% 60% at 30% 20%, rgba(255,255,255,0.55), transparent 60%), radial-gradient(60% 40% at 80% 90%, rgba(58,36,23,0.10), transparent 60%)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-end p-8">
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-[0.18em] ${accentText[r.accent]}`}>
                        {r.eyebrow}
                      </p>
                      <p className="mt-3 font-display text-3xl font-light leading-tight text-ink text-balance sm:text-4xl">
                        {r.heading}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>

              <div
                className={
                  i % 2 === 1
                    ? "lg:col-span-6 lg:col-start-1 lg:row-start-1"
                    : "lg:col-span-6 lg:col-start-7 lg:row-start-1"
                }
              >
                <Reveal delay={80}>
                  <p className={`text-xs font-medium uppercase tracking-[0.18em] ${accentText[r.accent]}`}>
                    {r.eyebrow}
                  </p>
                </Reveal>
                <Reveal delay={140}>
                  <h3 className="mt-4 font-display text-3xl font-light leading-[1.1] tracking-tightest text-ink text-balance sm:text-4xl">
                    {r.heading}
                  </h3>
                </Reveal>
                <Reveal delay={220}>
                  <p className="mt-6 text-lg leading-relaxed text-ink/75 text-pretty">
                    {r.body}
                  </p>
                </Reveal>
                <Reveal delay={300}>
                  <ul className="mt-8 space-y-3">
                    {r.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-ink/80">
                        <span
                          aria-hidden
                          className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                            r.accent === "burnt"
                              ? "bg-burnt"
                              : r.accent === "terracotta"
                              ? "bg-terracotta"
                              : "bg-marigold"
                          }`}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <Reveal delay={380}>
                  <Link
                    href={`/signup?role=${r.signupRole}`}
                    className={`mt-10 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-base font-medium text-cream shadow-raised transition ${accentBg[r.accent]}`}
                  >
                    {r.cta}
                    <span aria-hidden>→</span>
                  </Link>
                </Reveal>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
