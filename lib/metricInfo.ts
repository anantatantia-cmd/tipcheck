import type { PriceMetrics } from "./market";

// Plain-English explanations for every metric we show. "steadier" says which direction
// usually means less risk, for side-by-side comparisons. It describes the past, not the future.
export type MetricDef = {
  key: keyof PriceMetrics | "range";
  label: string;
  value: (m: PriceMetrics) => string;
  raw: (m: PriceMetrics) => number | null;
  what: string;
  why: string;
  steadier: "lower" | "higher" | null;
  affectedBySplit: boolean;
};

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const pct = (n: number | null) => (n === null ? "Not enough data" : `${n > 0 ? "+" : ""}${n}%`);

export const METRICS: MetricDef[] = [
  {
    key: "close",
    label: "Last closing price",
    value: (m) => rupees(m.close),
    raw: (m) => m.close,
    what: "The price of one share at the end of the last trading day we have.",
    why: "A low price doesn't make a share “cheap”. What matters is the business you're buying a slice of.",
    steadier: null,
    affectedBySplit: false,
  },
  {
    key: "ret1m",
    label: "Change in 1 month",
    value: (m) => pct(m.ret1m),
    raw: (m) => m.ret1m,
    what: "How much the price went up or down over roughly the last 21 trading days.",
    why: "Short-term moves are noisy. A big recent jump is often when hype tips start spreading.",
    steadier: null,
    affectedBySplit: true,
  },
  {
    key: "ret3m",
    label: "Change in 3 months",
    value: (m) => pct(m.ret3m),
    raw: (m) => m.ret3m,
    what: "How much the price changed over roughly the last 63 trading days.",
    why: "Gives a slightly longer view than one month, but it still says nothing certain about what happens next.",
    steadier: null,
    affectedBySplit: true,
  },
  {
    key: "ret1y",
    label: "Change in 1 year",
    value: (m) => pct(m.ret1y),
    raw: (m) => m.ret1y,
    what: "How much the price changed over the past year (about 250 trading days).",
    why: "Useful context, not a forecast. Last year's winners often aren't next year's.",
    steadier: null,
    affectedBySplit: true,
  },
  {
    key: "volatility",
    label: "Volatility (how much it swings)",
    value: (m) => `${m.volatility}% a year`,
    raw: (m) => m.volatility,
    what: "How much the price typically moves up and down, measured from daily changes over the past year.",
    why: "Higher volatility means bigger swings both ways, so you can lose money faster.",
    steadier: "lower",
    affectedBySplit: true,
  },
  {
    key: "maxDrawdown",
    label: "Biggest fall in the past year",
    value: (m) => `${m.maxDrawdown}%`,
    raw: (m) => m.maxDrawdown,
    what: "The largest drop from a high point to a later low within the past year.",
    why: "Shows the worst ride a holder actually went through. Ask yourself if you'd have held on.",
    steadier: "higher",
    affectedBySplit: true,
  },
  {
    key: "range",
    label: "52-week range",
    value: (m) => `${rupees(m.low52)} – ${rupees(m.high52)}`,
    raw: () => null,
    what: "The lowest and highest prices it traded at during the past year.",
    why: "Shows how wide the swings have been. Being near the low isn't a sign it will bounce.",
    steadier: null,
    affectedBySplit: true,
  },
  {
    key: "fromHigh",
    label: "Below its 52-week high by",
    value: (m) => (m.fromHigh === null ? "Not enough data" : `${Math.abs(m.fromHigh)}%`),
    raw: (m) => m.fromHigh,
    what: "How far today's price is under the highest price of the past year.",
    why: "A big gap can mean the business got worse, or the market cooled. “Cheaper than before” isn't the same as good value.",
    steadier: null,
    affectedBySplit: true,
  },
  {
    key: "avgValueCr",
    label: "Traded on a typical day",
    value: (m) => `₹${m.avgValueCr.toLocaleString("en-IN")} crore`,
    raw: (m) => m.avgValueCr,
    what: "The average value of shares bought and sold per day over the last 3 months.",
    why: "Actively traded stocks are easier to sell and harder to manipulate. Thinly traded ones can trap you.",
    steadier: "higher",
    affectedBySplit: false,
  },
];

// What a beginner would want but we can't show reliably yet.
export const MISSING = [
  { label: "Debt", why: "How much the company owes. Heavy debt can sink a business when times get tough." },
  { label: "Profitability", why: "Whether the company actually makes money, and how much from each ₹100 of sales." },
  { label: "Revenue growth", why: "Whether sales are growing, flat or shrinking over the years." },
  { label: "Valuation (P/E)", why: "How expensive the share is compared with the company's profits." },
];
