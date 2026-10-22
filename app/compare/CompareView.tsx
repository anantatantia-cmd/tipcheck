"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useReport } from "@/app/stocks/StocksView";
import { SignalItem } from "@/components/StockReportView";
import StockSearch, { SIZE_SHORT } from "@/components/StockSearch";
import type { PriceMetrics, StockReport } from "@/lib/market";
import { METRICS, type MetricDef } from "@/lib/metricInfo";

// For one metric, say which stock looks steadier, without declaring an overall winner.
function verdict(d: MetricDef, a: StockReport, b: StockReport): string {
  const ma = a.metrics, mb = b.metrics;
  if (!ma || !mb) return "Can't compare: price data missing for one of them.";
  if (d.affectedBySplit && (ma.possibleSplit || mb.possibleSplit)) return "Can't compare fairly: one may include a split or bonus.";
  const va = d.raw(ma), vb = d.raw(mb);
  if (va === null || vb === null) return "Not enough data to compare.";
  if (d.steadier === null) {
    if (d.key === "close") return "Share price alone says nothing about which is better value.";
    return va === vb ? "They moved the same." : `${va > vb ? a.symbol : b.symbol} rose more (or fell less). That's the past, not a forecast.`;
  }
  const close = Math.abs(va - vb) <= Math.max(Math.abs(va), Math.abs(vb)) * 0.1;
  if (close) return "About the same.";
  const aBetter = d.steadier === "lower" ? va < vb : va > vb;
  const who = aBetter ? a.symbol : b.symbol;
  if (d.key === "volatility") return `${who} has swung less.`;
  if (d.key === "maxDrawdown") return `${who} had a smaller worst fall.`;
  if (d.key === "avgValueCr") return `${who} trades more actively, so it's easier to buy and sell.`;
  return `${who} looks steadier on this.`;
}

function Slot({ label, report, state, onPick, onClear }: {
  label: string;
  report: StockReport | null;
  state: string;
  onPick: (s: string) => void;
  onClear: () => void;
}) {
  if (state === "loading") return <div className="h-24 animate-pulse rounded-2xl bg-black/[.04]" />;
  if (report)
    return (
      <div className="rounded-2xl p-4 ring-1 ring-black/10">
        <p className="text-xs uppercase tracking-wide text-black/45">{label}</p>
        <p className="mt-1 text-lg font-semibold">{report.name}</p>
        <p className="text-sm text-black/60">
          {report.symbol} · {SIZE_SHORT[report.size]}
          {report.industry ? ` · ${report.industry}` : ""}
        </p>
        <button type="button" onClick={onClear} className="mt-2 text-sm underline text-black/60">
          Change
        </button>
      </div>
    );
  return <StockSearch label={label} onPick={(r) => onPick(r.symbol)} />;
}

export default function CompareView() {
  const router = useRouter();
  const params = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const A = useReport(a);
  const B = useReport(b);

  const set = (key: "a" | "b", value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/compare?${next.toString()}`, { scroll: false });
  };

  const both = A.report && B.report && A.state === "idle" && B.state === "idle" ? [A.report, B.report] : null;
  const missing = (A.state === "missing" && a) || (B.state === "missing" && b);

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-2">
        <Slot label="First stock" report={A.report} state={A.state} onPick={(s) => set("a", s)} onClear={() => set("a", null)} />
        <Slot label="Second stock" report={B.report} state={B.state} onPick={(s) => set("b", s)} onClear={() => set("b", null)} />
      </div>

      {missing && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
          We couldn&apos;t find “{missing}” on NSE&apos;s list. Search by company name instead.
        </p>
      )}
      {(A.state === "error" || B.state === "error") && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
          Something went wrong loading a stock. Please try again.
        </p>
      )}

      {!both && !missing && (
        <p className="rounded-2xl bg-[#f7f7f5] p-5 text-black/65">Pick two stocks to see them side by side.</p>
      )}

      {both && a === b && (
        <p className="rounded-2xl bg-[#f7f7f5] p-5 text-black/65">That&apos;s the same stock twice. Pick a different second one.</p>
      )}

      {both && a !== b && (
        <>
          <section aria-labelledby="table-h">
            <h2 id="table-h" className="text-xl font-semibold">Measure by measure</h2>
            <p className="mt-1 text-xs text-black/55">
              End-of-day NSE prices, not live. As of {both[0].metrics?.asOf ?? both[0].data.asOf}. Past moves don&apos;t predict future
              ones.
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-black/10">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-black/[.03] text-left">
                  <tr>
                    <th scope="col" className="p-3 font-medium">Measure</th>
                    <th scope="col" className="p-3 font-medium">{both[0].symbol}</th>
                    <th scope="col" className="p-3 font-medium">{both[1].symbol}</th>
                    <th scope="col" className="p-3 font-medium">What it shows</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((d) => (
                    <tr key={d.key} className="border-t border-black/5 align-top">
                      <th scope="row" className="p-3 text-left font-normal">
                        {d.label}
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-black/50 underline">Explain</summary>
                          <p className="mt-1 text-xs text-black/65">{d.what} {d.why}</p>
                        </details>
                      </th>
                      <td className="p-3 tabular-nums">{both[0].metrics ? d.value(both[0].metrics as PriceMetrics) : "No data"}</td>
                      <td className="p-3 tabular-nums">{both[1].metrics ? d.value(both[1].metrics as PriceMetrics) : "No data"}</td>
                      <td className="p-3 text-black/70">{verdict(d, both[0], both[1])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="signals-h" className="grid gap-6 md:grid-cols-2">
            <h2 id="signals-h" className="sr-only">Strengths and concerns</h2>
            {both.map((r) => (
              <div key={r.symbol}>
                <h3 className="text-lg font-semibold">{r.name}: strengths and concerns</h3>
                {r.signals.length ? (
                  <ul className="mt-3 space-y-3">
                    {r.signals.map((s) => (
                      <SignalItem key={s.title} s={s} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-black/60">Nothing stands out either way in its price data.</p>
                )}
                <Link href={`/stocks?symbol=${encodeURIComponent(r.symbol)}`} className="mt-3 inline-block text-sm underline">
                  Full report for {r.symbol}
                </Link>
              </div>
            ))}
          </section>

          <p className="rounded-2xl bg-[#f7f7f5] p-5 text-sm text-black/65">
            <strong>No overall winner.</strong> A steadier stock isn&apos;t automatically a better investment, and a bigger past rise
            isn&apos;t a promise. Debt, profits, growth and valuation aren&apos;t available in TipCheck yet, so check them in each
            company&apos;s results before deciding anything.
          </p>
        </>
      )}
    </div>
  );
}
