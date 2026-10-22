"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import StockReportView from "@/components/StockReportView";
import StockSearch from "@/components/StockSearch";
import type { StockReport } from "@/lib/market";

const POPULAR = [
  { symbol: "TCS", name: "TCS" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "RELIANCE", name: "Reliance" },
  { symbol: "SUZLON", name: "Suzlon" },
  { symbol: "ETERNAL", name: "Eternal (Zomato)" },
];

// Loads one stock's report from /api/stocks. Shared with the Compare page.
type Loaded = { symbol: string; report: StockReport | null; state: "idle" | "error" | "missing" };

export function useReport(symbol: string | null): { report: StockReport | null; state: "idle" | "loading" | "error" | "missing" } {
  // Each result remembers which symbol it's for, so "loading" is derived, not set in the effect.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    if (!symbol) return;
    let live = true;
    fetch(`/api/stocks?symbol=${encodeURIComponent(symbol)}`)
      .then(async (r) => {
        if (!live) return;
        if (r.status === 404) return setLoaded({ symbol, report: null, state: "missing" });
        const d = await r.json();
        setLoaded({ symbol, report: d.report, state: "idle" });
      })
      .catch(() => live && setLoaded({ symbol, report: null, state: "error" }));
    return () => {
      live = false;
    };
  }, [symbol]);
  if (!symbol) return { report: null, state: "idle" };
  if (!loaded || loaded.symbol !== symbol) return { report: null, state: "loading" };
  return { report: loaded.report, state: loaded.state };
}

export default function StocksView() {
  const router = useRouter();
  const symbol = useSearchParams().get("symbol");
  const { report, state } = useReport(symbol);
  const open = (s: string) => router.push(`/stocks?symbol=${encodeURIComponent(s)}`, { scroll: false });

  return (
    <div className="space-y-10">
      <div className="max-w-xl">
        <StockSearch onPick={(r) => open(r.symbol)} autoFocus={!symbol} />
        {!symbol && (
          <div className="mt-4">
            <p className="text-sm text-black/55">Or try one:</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <li key={p.symbol}>
                  <button type="button" onClick={() => open(p.symbol)} className="rounded-full px-3 py-1.5 text-sm ring-1 ring-black/15 hover:bg-black/5">
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {state === "loading" && <div className="h-64 animate-pulse rounded-3xl bg-black/[.04]" aria-label="Loading stock report" />}
      {state === "missing" && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
          We couldn&apos;t find “{symbol}” on NSE&apos;s list of listed companies. Try searching by the company name.
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
          Something went wrong loading this stock. Please try again.
        </p>
      )}
      {state === "idle" && report && <StockReportView report={report} />}
    </div>
  );
}
