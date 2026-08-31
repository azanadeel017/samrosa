export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-cream/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-10">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-burnt"
            />
            <span className="font-display text-xl font-medium tracking-tightest text-ink">
              samrosa
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-ink/60">
            Food rescue for Middlesex County. Restaurants, shelters, and
            neighbors — moving good food where it's needed.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-ink/70 sm:flex sm:gap-8"
        >
          <a href="#how" className="link-underline hover:text-ink">
            How it works
          </a>
          <a href="#donors" className="link-underline hover:text-ink">
            Restaurants
          </a>
          <a href="#shelters" className="link-underline hover:text-ink">
            Shelters
          </a>
          <a href="#drivers" className="link-underline hover:text-ink">
            Volunteers
          </a>
        </nav>
      </div>
      <div className="border-t border-ink/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-ink/50 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>© {new Date().getFullYear()} Samrosa. All rights reserved.</p>
          <p>Built with care in New Jersey.</p>
        </div>
      </div>
    </footer>
  );
}
