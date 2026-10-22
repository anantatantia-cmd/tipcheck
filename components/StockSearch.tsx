"use client";

import { useEffect, useId, useState } from "react";
import type { CompanySize } from "@/lib/types";

export type SearchResult = { symbol: string; name: string; size: CompanySize; industry: string | null; hasPrices: boolean };

export const SIZE_SHORT: Record<CompanySize, string> = {
  large: "Large company",
  mid: "Mid-size",
  small: "Small company",
  very_small: "Very small",
};

// Search NSE stocks by company name or ticker. Keyboard: type, then Tab/arrow through results.
export default function StockSearch({
  label = "Search a stock",
  placeholder = "Company name or ticker, e.g. Infosys or TCS",
  onPick,
  autoFocus = false,
}: {
  label?: string;
  placeholder?: string;
  onPick: (r: SearchResult) => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  // Results remember the query they answer, so "searching" is derived rather than set in the effect.
  const [found, setFound] = useState<{ query: string; results: SearchResult[]; error: boolean } | null>(null);
  const query = q.trim();

  useEffect(() => {
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const data = await res.json();
        setFound({ query, results: data.results ?? [], error: false });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFound({ query, results: [], error: true });
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const current = found && found.query === query ? found : null;
  const results = current?.results ?? [];
  const state = !current ? "loading" : current.error ? "error" : "idle";

  return (
    <div className="relative">
      <label htmlFor={id} className="text-sm font-medium text-black/70">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="mt-1.5 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-[15px] outline-none focus:border-black/40"
      />
      {q.trim().length >= 2 && (
        <div className="mt-2 rounded-2xl bg-white ring-1 ring-black/10" aria-live="polite">
          {state === "error" ? (
            <p className="p-4 text-sm text-black/60">Search isn&apos;t working right now. Please try again.</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-black/60">{state === "loading" ? "Searching…" : "No NSE-listed company matches that."}</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(r);
                      setQ("");
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-black/5 px-4 py-3 text-left last:border-0 hover:bg-black/[.03] focus-visible:bg-black/[.05] focus-visible:outline-none"
                  >
                    <span>
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-2 text-sm text-black/50">{r.symbol}</span>
                    </span>
                    <span className="shrink-0 text-xs text-black/50">{SIZE_SHORT[r.size]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
