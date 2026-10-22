"use client";

import { useEffect, useState } from "react";

// A simple one-year line of weekly closing prices from NSE's end-of-day files.
export function useSeries(symbol: string | null) {
  // Each result remembers which symbol it's for, so a new symbol shows "loading" without
  // resetting state inside the effect.
  const [loaded, setLoaded] = useState<{ symbol: string; series: [string, number][] | null; failed: boolean } | null>(null);
  useEffect(() => {
    if (!symbol) return;
    let live = true;
    fetch(`/series/${symbol.replace(/[^A-Za-z0-9-]/g, "_")}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => live && setLoaded({ symbol, series: d, failed: false }))
      .catch(() => live && setLoaded({ symbol, series: null, failed: true }));
    return () => {
      live = false;
    };
  }, [symbol]);
  if (!symbol || !loaded || loaded.symbol !== symbol) return { series: null, failed: false };
  return { series: loaded.series, failed: loaded.failed };
}

export default function PriceChart({ symbol, name }: { symbol: string; name: string }) {
  const { series, failed } = useSeries(symbol);
  if (failed) return <p className="text-sm text-black/50">No price chart available for this stock.</p>;
  if (!series) return <div className="h-32 animate-pulse rounded-xl bg-black/[.04]" aria-label="Loading chart" />;
  if (series.length < 2) return <p className="text-sm text-black/50">Not enough price history to draw a chart.</p>;

  const W = 600, H = 140, P = 6;
  const ys = series.map((p) => p[1]);
  const min = Math.min(...ys), max = Math.max(...ys);
  const x = (i: number) => P + (i / (series.length - 1)) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const d = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
  const up = ys.at(-1)! >= ys[0];
  const first = series[0], last = series.at(-1)!;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-32 w-full"
        role="img"
        aria-label={`${name} weekly closing price from ${first[0]} (₹${first[1]}) to ${last[0]} (₹${last[1]})`}
        preserveAspectRatio="none"
      >
        <path d={d} fill="none" stroke={up ? "#047857" : "#b91c1c"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-black/50">
        <span>{first[0]} · ₹{first[1].toLocaleString("en-IN")}</span>
        <span>
          {last[0]} · ₹{last[1].toLocaleString("en-IN")}
        </span>
      </figcaption>
    </figure>
  );
}
