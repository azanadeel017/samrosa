import Link from "next/link";

export default function Nav() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 group" aria-label="Samrosa home">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-burnt transition-transform duration-300 group-hover:scale-125"
          />
          <span className="font-display text-xl font-medium tracking-tightest text-ink">
            samrosa
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-ink/80 sm:flex">
          <a href="#how" className="link-underline hover:text-ink">
            How it works
          </a>
          <a href="#donors" className="link-underline hover:text-ink">
            For restaurants
          </a>
          <a href="#shelters" className="link-underline hover:text-ink">
            For shelters
          </a>
          <a href="#drivers" className="link-underline hover:text-ink">
            Volunteer
          </a>
        </nav>

        <a
          href="#donors"
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream shadow-soft transition hover:bg-burnt sm:px-5"
        >
          Become a donor
        </a>
      </div>
    </header>
  );
}
