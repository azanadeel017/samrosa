"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/log", label: "Log Food" },
  { href: "/items", label: "Item Presets" },
];

export default function NavBar({
  onExport,
}: {
  onExport?: () => void;
}) {
  const pathname = usePathname();
  const { user, storeId, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 border-b border-ink/8 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Brand */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2"
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

        {/* Links */}
        <div className="flex items-center gap-1 sm:gap-3">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-burnt/10 text-burnt font-semibold"
                    : "text-ink/60 hover:text-ink hover:bg-ink/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="ml-2 rounded-full bg-burnt px-4 py-2 text-sm font-medium text-cream shadow-soft transition hover:bg-terracotta"
            >
              Export CSV
            </button>
          )}

          {user || storeId ? (
            <button
              type="button"
              onClick={() => logout()}
              title="Log out"
              className="ml-1 inline-flex items-center gap-1 rounded-lg p-2 text-sm text-ink/50 hover:bg-ink/5 hover:text-ink transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline text-xs">Log out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-burnt hover:text-cream hover:border-burnt transition"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
