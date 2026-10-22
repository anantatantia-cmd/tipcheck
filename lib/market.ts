import "server-only";
import nse from "@/data/nse_companies.json";
import nseSize from "@/data/nse_size.json";
import prices from "@/data/prices.json";
import type { CompanySize } from "./types";

// Market data for the Stocks, Compare and Watchlist pages. Everything here comes from saved,
// dated public NSE files; nothing is estimated. Fundamentals (debt, profits, revenue, P/E) are
// not available from a reliable free source yet, so they are reported as missing, never guessed.

export type PriceMetrics = {
  close: number;
  asOf: string;
  days: number;
  ret1m: number | null;
  ret3m: number | null;
  ret1y: number | null;
  volatility: number;
  maxDrawdown: number;
  high52: number;
  low52: number;
  fromHigh: number | null;
  avgValueCr: number;
  // Date of a one-day price move so large it's likely a split or bonus issue (raw prices
  // aren't adjusted), which distorts returns, drawdown and the 52-week range.
  possibleSplit: string | null;
};

export type Signal = { tone: "positive" | "concern" | "neutral"; title: string; detail: string };

export type StockReport = {
  symbol: string;
  name: string;
  size: CompanySize;
  industry: string | null;
  metrics: PriceMetrics | null;
  signals: Signal[];
  context: { medianVolatility: number; medianDrawdown: number; medianValueCr: number };
  data: { source: string; from: string; asOf: string; kind: "end-of-day" };
  links: { nse: string };
};

const METRICS = prices.metrics as Record<string, PriceMetrics>;
const SIZES: Record<string, { size: string; industry: string }> = nseSize.symbols;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

// Context figures, computed from the same real data so comparisons aren't made up.
const ALL = Object.values(METRICS);
const CONTEXT = {
  medianVolatility: +median(ALL.map((m) => m.volatility)).toFixed(1),
  medianDrawdown: +median(ALL.map((m) => m.maxDrawdown)).toFixed(1),
  medianValueCr: +median(ALL.map((m) => m.avgValueCr)).toFixed(2),
};

export const DATA_INFO = { source: prices.source, from: prices.from, asOf: prices.asOf, kind: "end-of-day" as const };

const COMPANIES = nse.companies;

export function searchStocks(query: string, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = COMPANIES.map((c) => {
    const sym = c.symbol.toLowerCase();
    const name = c.name.toLowerCase();
    const score =
      sym === q ? 100 : sym.startsWith(q) ? 80 : name.startsWith(q) ? 70 : name.includes(` ${q}`) ? 50 : name.includes(q) || sym.includes(q) ? 30 : 0;
    // Bigger, actively traded companies first when the match is equally good.
    const size = SIZES[c.symbol]?.size;
    const bump = size === "large" ? 3 : size === "mid" ? 2 : size === "small" ? 1 : 0;
    return { c, score: score ? score + bump : 0 };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map(({ c }) => ({
    symbol: c.symbol,
    name: c.name,
    size: ((SIZES[c.symbol]?.size as CompanySize) ?? "very_small") as CompanySize,
    industry: SIZES[c.symbol]?.industry || null,
    hasPrices: Boolean(METRICS[c.symbol]),
  }));
}

export function getStockReport(symbol: string): StockReport | null {
  const c = COMPANIES.find((x) => x.symbol === symbol.toUpperCase());
  if (!c) return null;
  const size = ((SIZES[c.symbol]?.size as CompanySize) ?? "very_small") as CompanySize;
  const metrics = METRICS[c.symbol] ?? null;
  return {
    symbol: c.symbol,
    name: c.name,
    size,
    industry: SIZES[c.symbol]?.industry || null,
    metrics,
    signals: buildSignals(size, metrics),
    context: CONTEXT,
    data: DATA_INFO,
    links: { nse: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(c.symbol)}` },
  };
}

// Plain-language signals with the threshold stated in each one. These describe the past;
// they are not predictions and are deliberately not added up into a single "score".
function buildSignals(size: CompanySize, m: PriceMetrics | null): Signal[] {
  const out: Signal[] = [];
  if (size === "large") {
    out.push({ tone: "positive", title: "One of India's 100 biggest listed companies", detail: "It's in the Nifty 100. Big companies are usually more closely watched and harder to manipulate." });
  } else if (size === "very_small") {
    out.push({ tone: "concern", title: "Very small company", detail: "It's outside India's top 500 listed companies (Nifty 100, Midcap 150 and Smallcap 250). Tiny companies are the easiest targets for pump-and-dump tips." });
  }
  if (!m) {
    out.push({ tone: "neutral", title: "No recent price data", detail: "This stock didn't trade in NSE's main equity segment often enough in the last year for us to measure it." });
    return out;
  }
  if (m.possibleSplit) {
    // Don't present distorted numbers as real falls or jumps.
    out.push({ tone: "neutral", title: "Price history may include a split or bonus", detail: `The price jumped or dropped unusually sharply on ${m.possibleSplit}, which usually means a stock split or bonus issue. Our prices aren't adjusted for these, so returns, the biggest fall and the 52-week range for this stock may be misleading.` });
    if (m.avgValueCr < 1) out.push({ tone: "concern", title: "Thinly traded", detail: `Only about ₹${m.avgValueCr} crore of its shares trade on a typical day. Thinly traded stocks can be hard to sell and easy to push around.` });
    return out;
  }
  const v = m.volatility;
  if (v >= Math.max(45, CONTEXT.medianVolatility * 1.4)) {
    out.push({ tone: "concern", title: "Swings a lot", detail: `Its price moved about ${v}% a year (volatility), versus ${CONTEXT.medianVolatility}% for a typical NSE stock. Big swings mean you can lose money fast.` });
  } else if (v <= CONTEXT.medianVolatility * 0.75) {
    out.push({ tone: "positive", title: "Steadier than most", detail: `Its price moved about ${v}% a year, less than the ${CONTEXT.medianVolatility}% typical for NSE stocks.` });
  }
  if (m.maxDrawdown <= -40) {
    out.push({ tone: "concern", title: "Fell sharply in the past year", detail: `At its worst it was ${Math.abs(m.maxDrawdown)}% below its previous high. Ask yourself if you could sit through a fall like that.` });
  }
  if (m.avgValueCr < 1) {
    out.push({ tone: "concern", title: "Thinly traded", detail: `Only about ₹${m.avgValueCr} crore of its shares trade on a typical day. Thinly traded stocks can be hard to sell and easy to push around.` });
  } else if (m.avgValueCr >= 100) {
    out.push({ tone: "positive", title: "Very actively traded", detail: `About ₹${Math.round(m.avgValueCr)} crore trades on a typical day, so buying or selling is easy.` });
  }
  if (m.ret1m !== null && m.ret1m >= 30) {
    out.push({ tone: "concern", title: "Big jump in the last month", detail: `Up ${m.ret1m}% in about a month. Sudden spikes are when hype tips spread; past jumps don't mean more are coming.` });
  }
  if (m.fromHigh !== null && m.fromHigh <= -50) {
    out.push({ tone: "neutral", title: "Far below its 52-week high", detail: `It's ${Math.abs(m.fromHigh)}% below its high of the past year. A big fall can mean the business got worse; "cheap" isn't the same as good value.` });
  }
  if (m.days < 200) {
    out.push({ tone: "neutral", title: "Short price history", detail: `We only have ${m.days} trading days of data for it (a full year is about 250), so some numbers are less reliable.` });
  }
  return out;
}
