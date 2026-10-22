"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const NAV = [
  { href: "/stocks", label: "Stocks" },
  { href: "/compare", label: "Compare" },
  { href: "/check", label: "Hype vs Facts" },
  { href: "/ask", label: "Ask" },
  { href: "/learn", label: "Learn" },
  { href: "/watchlist", label: "Watchlist" },
];

export default function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <span className="inline-block h-3.5 w-3.5 rounded-full bg-emerald-600" aria-hidden />
          tipcheck
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm ${isActive(n.href) ? "bg-black text-white" : "text-black/70 hover:bg-black/5 hover:text-black"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="rounded-full border border-black/15 px-3 py-1.5 text-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-black/5 px-4 pb-4 md:hidden">
          <ul className="grid grid-cols-2 gap-2 pt-3">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={`block rounded-xl px-3 py-2.5 text-sm ${isActive(n.href) ? "bg-black text-white" : "bg-black/[.04]"}`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
