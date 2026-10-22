"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSeries } from "@/components/PriceChart";
import StockSearch, { type SearchResult } from "@/components/StockSearch";
import type { StockReport } from "@/lib/market";
import { usePracticePortfolio, useWatchlist, type PracticeHolding } from "@/lib/storage";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const signed = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);

// Loads the latest reports for a set of symbols (one request, at most 25).
function useReports(symbols: string[]) {
  const key = symbols.join(",");
  const [loaded, setLoaded] = useState<{ key: string; reports: StockReport[]; error: boolean } | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch(`/api/stocks?symbols=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => live && setLoaded({ key, reports: d.reports ?? [], error: false }))
      .catch(() => live && setLoaded({ key, reports: [], error: true }));
    return () => {
      live = false;
    };
  }, [key]);
  if (!key) return { reports: [] as StockReport[], loading: false, error: false };
  if (!loaded || loaded.key !== key) return { reports: [] as StockReport[], loading: true, error: false };
  return { reports: loaded.reports, loading: false, error: loaded.error };
}

function Watchlist() {
  const { list, toggle } = useWatchlist();
  const { reports, loading, error } = useReports(list);

  return (
    <section aria-labelledby="watch-h">
      <h2 id="watch-h" className="text-2xl font-semibold">Your watchlist</h2>
      {list.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-[#f7f7f5] p-5 text-black/65">
          Nothing here yet. Open any stock on the <Link href="/stocks" className="underline">Stocks page</Link> and tap “Add to
          watchlist”.
        </p>
      ) : loading ? (
        <div className="mt-3 h-32 animate-pulse rounded-2xl bg-black/[.04]" aria-label="Loading watchlist" />
      ) : error ? (
        <p role="alert" className="mt-3 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
          Couldn&apos;t load your watchlist right now. Please try again.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-black/55">End-of-day NSE prices, not live. As of {reports[0]?.metrics?.asOf ?? reports[0]?.data.asOf}.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {reports.map((r) => {
              const m = r.metrics;
              const concern = r.signals.find((s) => s.tone === "concern");
              return (
                <li key={r.symbol} className="rounded-2xl p-4 ring-1 ring-black/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/stocks?symbol=${encodeURIComponent(r.symbol)}`} className="font-semibold underline-offset-2 hover:underline">
                        {r.name}
                      </Link>
                      <p className="text-sm text-black/55">{r.symbol}</p>
                    </div>
                    <button type="button" onClick={() => toggle(r.symbol)} className="text-sm underline text-black/55" aria-label={`Remove ${r.name} from watchlist`}>
                      Remove
                    </button>
                  </div>
                  {m ? (
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-black/50">Last close</dt>
                        <dd className="font-medium tabular-nums">₹{m.close.toLocaleString("en-IN")}</dd>
                      </div>
                      <div>
                        <dt className="text-black/50">1 month</dt>
                        <dd className="font-medium tabular-nums">{signed(m.ret1m)}</dd>
                      </div>
                      <div>
                        <dt className="text-black/50">Swings</dt>
                        <dd className="font-medium tabular-nums">{m.volatility}%/yr</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-black/55">No recent price data.</p>
                  )}
                  {concern && (
                    <p className="mt-3 text-sm text-red-900">
                      <span aria-hidden>⚠ </span>
                      <span className="sr-only">Concern: </span>
                      {concern.title}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

// Add a pretend investment: pick a stock, an amount and a past date from its price history.
function AddPractice({ onAdd }: { onAdd: (h: Omit<PracticeHolding, "id">) => void }) {
  const [stock, setStock] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState("10000");
  const [date, setDate] = useState("");
  const { series, failed } = useSeries(stock?.symbol ?? null);
  const options = series ? series.slice(0, -1) : [];
  const chosen = options.find((p) => p[0] === date) ?? options[0];
  const value = Number(amount);
  const amountOk = Number.isFinite(value) && value >= 100 && value <= 1000000;

  if (!stock) return <StockSearch label="Practise with a stock" onPick={setStock} />;

  return (
    <form
      className="space-y-3 rounded-2xl p-4 ring-1 ring-black/10"
      onSubmit={(e) => {
        e.preventDefault();
        if (!chosen || !amountOk) return;
        onAdd({ symbol: stock.symbol, name: stock.name, amount: value, date: chosen[0], price: chosen[1] });
        setStock(null);
        setDate("");
      }}
    >
      <p className="font-medium">
        {stock.name} <span className="text-sm text-black/50">{stock.symbol}</span>{" "}
        <button type="button" onClick={() => setStock(null)} className="text-sm underline text-black/55">
          Change
        </button>
      </p>
      {failed || (series && options.length === 0) ? (
        <p className="text-sm text-black/60">No price history for this stock, so we can&apos;t simulate it.</p>
      ) : !series ? (
        <p className="text-sm text-black/55">Loading its price history…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-black/60">Pretend amount (₹100 – ₹10,00,000)</span>
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={1000000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-black/60">Pretend you invested on</span>
            <select value={chosen?.[0] ?? ""} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2">
              {options.map((p) => (
                <option key={p[0]} value={p[0]}>
                  {p[0]} (₹{p[1].toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {series && options.length > 0 && (
        <button type="submit" disabled={!amountOk} className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40">
          Add pretend investment
        </button>
      )}
      {!amountOk && <p className="text-sm text-amber-800">Enter an amount between ₹100 and ₹10,00,000.</p>}
    </form>
  );
}

function Practice() {
  const { holdings, add, remove } = usePracticePortfolio();
  const symbols = [...new Set(holdings.map((h) => h.symbol))];
  const { reports } = useReports(symbols);
  const latest = new Map(reports.map((r) => [r.symbol, r]));

  const rows = holdings.map((h) => {
    const r = latest.get(h.symbol);
    const close = r?.metrics?.close ?? null;
    const now = close !== null ? h.amount * (close / h.price) : null;
    const split = r?.metrics?.possibleSplit && r.metrics.possibleSplit > h.date ? r.metrics.possibleSplit : null;
    return { h, now, ret: now !== null ? ((now - h.amount) / h.amount) * 100 : null, asOf: r?.metrics?.asOf, split };
  });
  const invested = rows.reduce((s, r) => s + r.h.amount, 0);
  const worth = rows.reduce((s, r) => s + (r.now ?? r.h.amount), 0);

  return (
    <section aria-labelledby="practice-h">
      <h2 id="practice-h" className="text-2xl font-semibold">Practice portfolio</h2>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
        <strong>Pretend money only.</strong> This shows what would have happened using real past NSE closing prices. It isn&apos;t
        real money, ignores brokerage and taxes, and past results don&apos;t predict future ones.
      </p>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_1.3fr]">
        <AddPractice onAdd={add} />
        <div>
          {rows.length === 0 ? (
            <p className="rounded-2xl bg-[#f7f7f5] p-5 text-black/65">
              No pretend investments yet. Pick a stock, an amount and a past date to see how it would have gone.
            </p>
          ) : (
            <>
              <div className="rounded-2xl bg-black p-5 text-white">
                <p className="text-sm text-white/60">Pretend total</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{inr(worth)}</p>
                <p className="mt-1 text-sm text-white/70">
                  from {inr(invested)} pretend-invested ({signed(invested ? ((worth - invested) / invested) * 100 : 0)})
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {rows.map(({ h, now, ret, asOf, split }) => (
                  <li key={h.id} className="rounded-xl p-3 ring-1 ring-black/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{h.name}</p>
                        <p className="text-sm text-black/55">
                          {inr(h.amount)} on {h.date} at ₹{h.price.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <button type="button" onClick={() => remove(h.id)} className="text-sm underline text-black/55" aria-label={`Remove pretend investment in ${h.name}`}>
                        Remove
                      </button>
                    </div>
                    <p className="mt-1 text-sm">
                      {now === null ? (
                        "Couldn't load its latest price."
                      ) : (
                        <>
                          Worth <strong className="tabular-nums">{inr(now)}</strong> on {asOf}{" "}
                          <span className="tabular-nums">
                            ({ret !== null && ret >= 0 ? "▲" : "▼"} {signed(ret)})
                          </span>
                        </>
                      )}
                    </p>
                    {split && <p className="mt-1 text-xs text-amber-800">A possible split or bonus on {split} may distort this result.</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function WatchlistView() {
  return (
    <div className="space-y-12">
      <Watchlist />
      <Practice />
    </div>
  );
}
