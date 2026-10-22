"use client";

import Link from "next/link";
import PriceChart from "@/components/PriceChart";
import { SIZE_SHORT } from "@/components/StockSearch";
import type { Signal, StockReport } from "@/lib/market";
import { METRICS, MISSING } from "@/lib/metricInfo";
import { useWatchlist } from "@/lib/storage";

const TONE = {
  positive: { icon: "✓", label: "Good sign", cls: "bg-emerald-50 ring-emerald-200 text-emerald-950" },
  concern: { icon: "⚠", label: "Concern", cls: "bg-red-50 ring-red-200 text-red-950" },
  neutral: { icon: "ℹ", label: "Worth knowing", cls: "bg-black/[.03] ring-black/10 text-black" },
} as const;

export function SignalItem({ s }: { s: Signal }) {
  const t = TONE[s.tone];
  return (
    <li className={`rounded-xl p-4 ring-1 ${t.cls}`}>
      <p className="font-medium">
        <span aria-hidden>{t.icon} </span>
        <span className="sr-only">{t.label}: </span>
        {s.title}
      </p>
      <p className="mt-1 text-sm opacity-80">{s.detail}</p>
    </li>
  );
}

export function WatchButton({ symbol }: { symbol: string }) {
  const { has, toggle } = useWatchlist();
  const on = has(symbol);
  return (
    <button
      type="button"
      onClick={() => toggle(symbol)}
      aria-pressed={on}
      className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${on ? "bg-black text-white ring-black" : "ring-black/20 hover:bg-black/5"}`}
    >
      {on ? "★ On your watchlist" : "☆ Add to watchlist"}
    </button>
  );
}

export function DataBadge({ report }: { report: StockReport }) {
  return (
    <p className="text-xs text-black/55">
      <span className="rounded-full bg-black/[.05] px-2 py-0.5 font-medium text-black/70">End of day, not live</span>{" "}
      Prices as of {report.metrics?.asOf ?? report.data.asOf} · Source:{" "}
      <a href="https://www.nseindia.com/all-reports" target="_blank" rel="noreferrer" className="underline">
        NSE daily price files
      </a>
    </p>
  );
}

export default function StockReportView({ report }: { report: StockReport }) {
  const m = report.metrics;
  const positives = report.signals.filter((s) => s.tone === "positive");
  const concerns = report.signals.filter((s) => s.tone === "concern");
  const neutral = report.signals.filter((s) => s.tone === "neutral");

  return (
    <article className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-4xl leading-tight">{report.name}</h2>
          <p className="mt-1 text-black/60">
            NSE: {report.symbol} · {SIZE_SHORT[report.size]}
            {report.industry ? ` · ${report.industry}` : ""}
          </p>
          <div className="mt-2">
            <DataBadge report={report} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <WatchButton symbol={report.symbol} />
          <Link href={`/compare?a=${encodeURIComponent(report.symbol)}`} className="rounded-full px-4 py-2 text-sm font-medium ring-1 ring-black/20 hover:bg-black/5">
            Compare
          </Link>
        </div>
      </header>

      {m ? (
        <section aria-labelledby="chart-h">
          <h3 id="chart-h" className="sr-only">
            Price over the past year
          </h3>
          <PriceChart symbol={report.symbol} name={report.name} />
        </section>
      ) : null}

      <section aria-labelledby="signals-h">
        <h3 id="signals-h" className="text-xl font-semibold">Risk overview</h3>
        <p className="mt-1 text-sm text-black/60">
          What the past year of data shows, in plain words. This describes the past. It isn&apos;t a prediction, and it isn&apos;t a
          reason to buy or sell.
        </p>
        {report.signals.length === 0 ? (
          <p className="mt-4 rounded-xl bg-black/[.03] p-4 text-sm">Nothing stands out either way in the price data we have.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {[...concerns, ...neutral, ...positives].map((s) => (
              <SignalItem key={s.title} s={s} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="metrics-h">
        <h3 id="metrics-h" className="text-xl font-semibold">The numbers, explained</h3>
        {!m ? (
          <p className="mt-3 rounded-xl bg-black/[.03] p-4 text-sm">
            We don&apos;t have recent price data for this stock. It may trade rarely, or outside NSE&apos;s main equity segment.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {METRICS.map((d) => (
              <li key={d.key} className="rounded-xl p-4 ring-1 ring-black/10">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-black/60">{d.label}</span>
                  <span className="font-semibold tabular-nums">{d.value(m)}</span>
                </div>
                {m.possibleSplit && d.affectedBySplit && (
                  <p className="mt-1 text-xs text-amber-800">May be distorted by a split or bonus on {m.possibleSplit}.</p>
                )}
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-black/60 underline">What this means</summary>
                  <p className="mt-2">{d.what}</p>
                  <p className="mt-1 text-black/65">
                    <strong>Why it matters:</strong> {d.why}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        )}
        {m && (
          <p className="mt-3 text-xs text-black/50">
            For context, a typical NSE stock swung about {report.context.medianVolatility}% a year, fell at most{" "}
            {Math.abs(report.context.medianDrawdown)}% from a high, and traded about ₹{report.context.medianValueCr} crore a day over
            the same period ({report.data.from} to {report.data.asOf}). Based on {m.days} trading days for this stock.
          </p>
        )}
      </section>

      <section aria-labelledby="missing-h" className="rounded-2xl bg-[#f7f7f5] p-5">
        <h3 id="missing-h" className="text-lg font-semibold">Not available in TipCheck yet</h3>
        <p className="mt-1 text-sm text-black/60">
          We don&apos;t have a reliable free source for these, so we show nothing rather than guess. Check them in the
          company&apos;s results on NSE.
        </p>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {MISSING.map((x) => (
            <li key={x.label}>
              <strong>{x.label}:</strong> <span className="text-black/65">{x.why}</span>
            </li>
          ))}
        </ul>
        <a href={report.links.nse} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-sm font-medium text-white">
          Open {report.symbol} on NSE ↗
        </a>
      </section>
    </article>
  );
}
