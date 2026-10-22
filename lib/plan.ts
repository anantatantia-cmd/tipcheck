// The planner's rules engine. Given someone's answers (amount, goal, time, comfort with falls,
// experience), it lays out common kinds of investment with real numbers and plain reasons why each
// may or may not line up with those answers.
//
// It deliberately works at the level of *kinds* of investment (a Nifty 50 index fund, a Post Office
// deposit), never specific stocks or schemes, gives no amounts or percentages to put anywhere, and
// ranks nothing as "best". Personalised recommendations of particular securities are investment
// advice under the SEBI (Investment Advisers) Regulations, 2013, which needs SEBI registration.
import { z } from "zod";
import data from "@/data/options.json";

export const Profile = z.object({
  amount: z.number().int().min(100).max(10_000_000),
  mode: z.enum(["once", "monthly"]),
  goal: z.enum(["emergency", "short", "wealth", "learn"]),
  horizon: z.enum(["lt1", "1to3", "3to5", "5plus"]),
  risk: z.enum(["low", "medium", "high"]),
  experience: z.enum(["none", "some", "stocks"]),
  emergencyFund: z.enum(["yes", "no", "unsure"]),
});
export type Profile = z.infer<typeof Profile>;

export type Tone = "good" | "caution" | "mismatch";
export type Reason = { tone: Tone; text: string };
export type Source = { label: string; url: string; date: string };
export type Indicator = { label: string; value: string; note?: string; unavailable?: boolean };

export type OptionResult = {
  id: string;
  name: string;
  kind: string;
  what: string;
  verdict: "lines_up" | "tradeoffs" | "not_now";
  reasons: Reason[];
  indicators: Indicator[];
  risks: string[];
  concepts: string[];
  sources: Source[];
  stale: string | null; // set when the data behind this option is out of date
};

export type PlanResult = {
  options: OptionResult[];
  data: { marketFrom: string; marketAsOf: string; savingsQuarter: string; savingsValidUntil: string };
  basis: string;
};

// Smallest number of years each answer could mean, used to check lock-ins.
const HORIZON_MIN_YEARS: Record<Profile["horizon"], number> = { lt1: 0, "1to3": 1, "3to5": 3, "5plus": 5 };
const HORIZON_TEXT: Record<Profile["horizon"], string> = {
  lt1: "within a year",
  "1to3": "in 1–3 years",
  "3to5": "in 3–5 years",
  "5plus": "in 5+ years",
};

const m = data.market;
const ss = data.smallSavings;
const MARKET_WINDOW = `${m.from} to ${m.asOf}`;
const NSE_INDEX: Source = { label: "NSE daily index closing values", url: "https://www.nseindia.com/reports-indices-historical-index-data", date: m.asOf };
const NSE_PRICES: Source = { label: "NSE end-of-day price files (bhavcopy)", url: "https://www.nseindia.com/all-reports", date: m.asOf };
const AMFI: Source = { label: "AMFI NAV data (history via mfapi.in)", url: "https://www.amfiindia.com/net-asset-value", date: m.liquidFunds.asOf };
const AMFI_TER: Source = { label: "AMFI: expense ratios (TER) of every scheme", url: "https://www.amfiindia.com/ter-of-mf-schemes", date: "check live" };
const SMALL_SAVINGS: Source = { label: `Govt small savings rates, ${ss.quarter}`, url: ss.url, date: ss.validUntil };
const NSI: Source = { label: "National Savings Institute: scheme rules", url: ss.officialUrl, date: "check live" };
const DICGC: Source = { label: "DICGC: deposit insurance up to ₹5 lakh per bank", url: "https://www.dicgc.org.in/", date: "check live" };

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const sentence = (t: string) => `${t.replace(/\.$/, "")}.`;
const pct = (n: number) => `${n > 0 ? "+" : ""}${n}%`;

type Def = {
  id: string;
  name: string;
  kind: string;
  what: string;
  minimum: number; // smallest amount you can start with, in rupees (per month for monthly-only options)
  minimumText: string;
  minimumIsFirm?: boolean; // true when the minimum is a fixed rule (PPF); otherwise it varies by bank, scheme or share
  lockYears: number; // money can't come out (or only at a penalty) before this
  lockText: string;
  liquidity: string;
  costs: Indicator;
  diversification: string;
  marketLinked: boolean; // can the amount you put in go down?
  worstFall: number; // worst past-year fall in %, 0 for fixed-rate deposits
  returnIndicator: Indicator;
  extra?: Indicator[];
  needsDemat: boolean;
  monthlyOnly?: boolean;
  singleCompany?: boolean;
  risks: string[];
  concepts: string[];
  sources: Source[];
  uses: "market" | "savings";
};

const idx = m.indices;
const midSmallFall = Math.min(idx["Nifty Midcap 150"].maxDrawdown, idx["Nifty Smallcap 250"].maxDrawdown);

const DEFS: Def[] = [
  {
    id: "savings",
    name: "Savings account",
    kind: "Bank or Post Office",
    what: "Money sits in your account, earns a small interest rate, and you can take it out any time.",
    minimum: 500,
    minimumText: "₹500 to open a Post Office savings account; banks set their own minimum balance",
    lockYears: 0,
    lockText: "None",
    liquidity: "Any time",
    costs: { label: "Costs", value: "Usually none, but some banks charge if you go below a minimum balance" },
    diversification: "Not needed: it's a deposit, not an investment in companies",
    marketLinked: false,
    worstFall: 0,
    returnIndicator: { label: "Interest", value: `${ss.rates.savings}% a year (Post Office)`, note: "Bank rates vary by bank and aren't in our data. Check your bank's website." },
    needsDemat: false,
    risks: ["Interest is low, often below inflation, so money can lose buying power over time.", "Bank deposits are insured up to ₹5 lakh per person per bank (DICGC)."],
    concepts: ["inflation", "liquidity"],
    sources: [SMALL_SAVINGS, DICGC],
    uses: "savings",
  },
  {
    id: "fd",
    name: "Fixed deposit",
    kind: "Post Office time deposit, or a bank FD",
    what: "You lock a lump sum for a fixed time (1–5 years at the Post Office) at an interest rate fixed on day one.",
    minimum: 1000,
    minimumText: "₹1,000 for a Post Office time deposit; banks set their own",
    lockYears: 0.5,
    lockText: "Can't withdraw in the first 6 months; closing early earns a lower rate",
    liquidity: "Locked for the term you pick (early exit at a lower rate after 6 months)",
    costs: { label: "Costs", value: "No fees, but closing early cuts the interest you earn" },
    diversification: "Not needed: it's a deposit",
    marketLinked: false,
    worstFall: 0,
    returnIndicator: {
      label: "Interest (Post Office)",
      value: `${ss.rates.td1}% (1 yr) · ${ss.rates.td2}% (2 yr) · ${ss.rates.td3}% (3 yr) · ${ss.rates.td5}% (5 yr)`,
      note: "Fixed for the whole term. Bank FD rates vary by bank and aren't in our data.",
    },
    needsDemat: false,
    risks: ["Money is tied up for the term; you get less interest if you need it early.", "Interest is taxed at your income tax rate."],
    concepts: ["lock_in", "inflation"],
    sources: [SMALL_SAVINGS, NSI, DICGC],
    uses: "savings",
  },
  {
    id: "rd",
    name: "Recurring deposit",
    kind: "Post Office RD, or a bank RD",
    what: "You put in the same small amount every month, and get it back with interest at the end.",
    minimum: 100,
    minimumText: "₹100 a month at the Post Office",
    lockYears: 3,
    lockText: "5-year term at the Post Office; can close early only after 3 years",
    liquidity: "Locked for most of the term",
    costs: { label: "Costs", value: "No fees; a small penalty if you miss a month" },
    diversification: "Not needed: it's a deposit",
    marketLinked: false,
    worstFall: 0,
    returnIndicator: { label: "Interest (Post Office, 5 yr)", value: `${ss.rates.rd5}% a year`, note: "Bank RD rates vary and aren't in our data." },
    needsDemat: false,
    monthlyOnly: true,
    risks: ["The Post Office RD runs for 5 years; banks offer shorter ones.", "Interest is taxed at your income tax rate."],
    concepts: ["lock_in", "compounding"],
    sources: [SMALL_SAVINGS, NSI],
    uses: "savings",
  },
  {
    id: "ppf",
    name: "Public Provident Fund (PPF)",
    kind: "Government savings scheme",
    what: "A long-term government-backed account. The rate is set every quarter by the government, and the interest is tax-free.",
    minimum: 500,
    minimumText: "₹500 a year (maximum ₹1.5 lakh a year)",
    minimumIsFirm: true,
    lockYears: 15,
    lockText: "15 years; partial withdrawals allowed from the 7th year",
    liquidity: "Locked for 15 years (partial withdrawals from year 7)",
    costs: { label: "Costs", value: "No fees" },
    diversification: "Not needed: it's a government scheme",
    marketLinked: false,
    worstFall: 0,
    returnIndicator: { label: "Interest", value: `${ss.rates.ppf}% a year for ${ss.quarter}`, note: "The government can change it every quarter." },
    needsDemat: false,
    risks: ["Very long lock-in: the money is tied up for years.", "The rate can change every quarter."],
    concepts: ["lock_in", "compounding"],
    sources: [SMALL_SAVINGS, NSI],
    uses: "savings",
  },
  {
    id: "liquid",
    name: "Liquid mutual funds",
    kind: "Mutual fund (debt)",
    what: "Funds that lend money for very short periods (up to 91 days) to governments, banks and big companies. Used by many as a place to park money.",
    minimum: 500,
    minimumText: "Varies by fund, often a few hundred rupees. Check the scheme's minimum.",
    lockYears: 0,
    lockText: "None (a tiny exit charge if you withdraw within 7 days)",
    liquidity: "Usually back in your bank the next working day",
    costs: { label: "Yearly fund fee (expense ratio)", value: "Not in our data yet", note: "Look it up for any scheme on AMFI's TER page.", unavailable: true },
    diversification: "Spread across many short-term loans",
    marketLinked: true,
    worstFall: m.liquidFunds.worstDrawdown,
    returnIndicator: {
      label: "Past year's return",
      value: `${pct(m.liquidFunds.medianRet1y)} (typical fund)`,
      note: `Middle of ${m.liquidFunds.count} direct-plan liquid funds; 9 in 10 earned at least ${m.liquidFunds.lowRet1y}%. ${MARKET_WINDOW}. Not guaranteed.`,
    },
    extra: [{ label: "Biggest dip in the past year", value: `${m.liquidFunds.worstDrawdown}% (worst of ${m.liquidFunds.count} funds)` }],
    needsDemat: false,
    risks: ["Not guaranteed: rarely, a fund can lose money if a borrower defaults.", "Returns move with interest rates.", "Not covered by deposit insurance."],
    concepts: ["mutual_fund", "expense_ratio", "liquidity"],
    sources: [AMFI, AMFI_TER],
    uses: "market",
  },
  {
    id: "nifty50",
    name: "Nifty 50 index funds and ETFs",
    kind: "Mutual fund or ETF (shares)",
    what: "One investment that holds India's 50 largest listed companies, in the same mix as the Nifty 50 index.",
    minimum: 500,
    minimumText: "Many index funds allow SIPs from ₹100–₹500; an ETF costs the price of one unit",
    lockYears: 0,
    lockText: "None",
    liquidity: "Fund: money back in 2–3 working days. ETF: sell on any trading day.",
    costs: { label: "Yearly fund fee (expense ratio)", value: "Not in our data yet", note: "Index funds tend to have low fees. Check the scheme on AMFI's TER page.", unavailable: true },
    diversification: "50 large companies across many industries",
    marketLinked: true,
    worstFall: idx["Nifty 50"].maxDrawdown,
    returnIndicator: { label: "Nifty 50, past year", value: pct(idx["Nifty 50"].ret1y), note: `${MARKET_WINDOW}. Index only; a fund's return is a little lower after fees.` },
    extra: [
      { label: "Biggest fall in the past year", value: `${idx["Nifty 50"].maxDrawdown}%` },
      { label: "How much it swings", value: `${idx["Nifty 50"].volatility}% a year (volatility)` },
      ...(idx["Nifty 50"].pe ? [{ label: "Price to earnings (P/E)", value: `${idx["Nifty 50"].pe}`, note: "For the index as a whole, from NSE." }] : []),
    ],
    needsDemat: false,
    risks: ["Its value goes up and down with the stock market, and can fall for long stretches.", "Spread across 50 companies, but all large Indian ones."],
    concepts: ["index_fund", "diversification", "drawdown", "volatility", "sip"],
    sources: [NSE_INDEX, AMFI_TER],
    uses: "market",
  },
  {
    id: "midsmall",
    name: "Mid and small company index funds",
    kind: "Mutual fund or ETF (shares)",
    what: "Funds that hold hundreds of medium or small Indian companies, e.g. the Nifty Midcap 150 or Nifty Smallcap 250 index.",
    minimum: 500,
    minimumText: "Many allow SIPs from ₹100–₹500. Check the scheme.",
    lockYears: 0,
    lockText: "None",
    liquidity: "Money back in 2–3 working days",
    costs: { label: "Yearly fund fee (expense ratio)", value: "Not in our data yet", note: "Check the scheme on AMFI's TER page.", unavailable: true },
    diversification: "150–250 companies, but all smaller ones",
    marketLinked: true,
    worstFall: midSmallFall,
    returnIndicator: {
      label: "Past year",
      value: `Midcap 150 ${pct(idx["Nifty Midcap 150"].ret1y)} · Smallcap 250 ${pct(idx["Nifty Smallcap 250"].ret1y)}`,
      note: `${MARKET_WINDOW}. Index only, before fund fees.`,
    },
    extra: [
      { label: "Biggest fall in the past year", value: `Midcap ${idx["Nifty Midcap 150"].maxDrawdown}% · Smallcap ${idx["Nifty Smallcap 250"].maxDrawdown}%` },
      { label: "How much they swing", value: `Midcap ${idx["Nifty Midcap 150"].volatility}% · Smallcap ${idx["Nifty Smallcap 250"].volatility}% a year` },
    ],
    needsDemat: false,
    risks: ["Smaller companies usually swing more than large ones, and falls can be deep and long.", "One year of data is a short window."],
    concepts: ["index_fund", "volatility", "drawdown", "diversification"],
    sources: [NSE_INDEX, AMFI_TER],
    uses: "market",
  },
  {
    id: "gold",
    name: "Gold ETFs and gold funds",
    kind: "ETF or mutual fund (gold)",
    what: "Track the price of gold without buying physical gold. ETFs trade on NSE; gold mutual funds don't need a demat account.",
    minimum: m.goldEtfs.medianUnitPrice,
    minimumText: `ETF: the price of one unit (typically about ${inr(m.goldEtfs.medianUnitPrice)} on ${m.goldEtfs.asOf}). Gold funds: check the scheme.`,
    lockYears: 0,
    lockText: "None",
    liquidity: "ETF: sell on any trading day. Fund: a few working days.",
    costs: { label: "Costs", value: "Yearly fund fee plus brokerage for ETFs. Fees not in our data yet.", unavailable: true },
    diversification: "One asset (gold), different from shares",
    marketLinked: true,
    worstFall: m.goldEtfs.worstDrawdown,
    returnIndicator: { label: "Past year (typical gold ETF)", value: pct(m.goldEtfs.medianRet1y), note: `Middle of ${m.goldEtfs.count} actively traded gold ETFs on NSE. ${MARKET_WINDOW}.` },
    extra: [
      { label: "Biggest fall in the past year", value: `${m.goldEtfs.worstDrawdown}% (worst of ${m.goldEtfs.count} ETFs)` },
      { label: "How much it swings", value: `${m.goldEtfs.medianVolatility}% a year (typical)` },
    ],
    needsDemat: true,
    risks: ["Gold prices can fall and stay low for years.", "Gold doesn't pay interest or dividends."],
    concepts: ["etf", "volatility", "diversification", "demat"],
    sources: [NSE_PRICES, AMFI_TER],
    uses: "market",
  },
  {
    id: "largestock",
    name: "Shares of one large company",
    kind: "Direct stocks",
    what: "Buying shares of a single big listed company yourself, through a broker app.",
    minimum: m.stocks.large.medianPrice,
    minimumText: `The price of one share: typically about ${inr(m.stocks.large.medianPrice)} for a large company (${m.asOf})`,
    lockYears: 0,
    lockText: "None",
    liquidity: "Sell on any trading day",
    costs: { label: "Costs", value: "Brokerage (varies by broker), securities transaction tax and small charges on every buy and sell" },
    diversification: "One company: if it has a bad year, so do you",
    marketLinked: true,
    worstFall: m.stocks.large.medianDrawdown,
    returnIndicator: {
      label: "Past year, typical large company",
      value: pct(m.stocks.large.medianRet1y),
      note: `Middle of ${m.stocks.large.count} large NSE companies; ${m.stocks.large.shareOfRisers}% of them went up. ${MARKET_WINDOW}.`,
    },
    extra: [
      { label: "Biggest fall in the past year", value: `${m.stocks.large.medianDrawdown}% typical; 1 in 10 fell ${m.stocks.large.worstTenthDrawdown}% or more` },
      { label: "How much they swing", value: `${m.stocks.large.medianVolatility}% a year (typical)` },
    ],
    needsDemat: true,
    singleCompany: true,
    risks: ["All your money rides on one company.", "Picking companies takes time and research; most beginners can't spread across many."],
    concepts: ["diversification", "demat", "drawdown", "volatility"],
    sources: [NSE_PRICES],
    uses: "market",
  },
  {
    id: "smallstock",
    name: "Shares of one small company",
    kind: "Direct stocks",
    what: "Buying shares of a single small listed company. These are the stocks most often pushed in tips.",
    minimum: m.stocks.small.medianPrice,
    minimumText: `The price of one share: typically about ${inr(m.stocks.small.medianPrice)} for a small company (${m.asOf})`,
    lockYears: 0,
    lockText: "None",
    liquidity: "Sell on any trading day, though some trade so little that selling can be hard",
    costs: { label: "Costs", value: "Brokerage (varies by broker), securities transaction tax and small charges on every buy and sell" },
    diversification: "One small company",
    marketLinked: true,
    worstFall: m.stocks.small.medianDrawdown,
    returnIndicator: {
      label: "Past year, typical small company",
      value: pct(m.stocks.small.medianRet1y),
      note: `Middle of ${m.stocks.small.count} small NSE companies; ${m.stocks.small.shareOfRisers}% of them went up. ${MARKET_WINDOW}.`,
    },
    extra: [
      { label: "Biggest fall in the past year", value: `${m.stocks.small.medianDrawdown}% typical; 1 in 10 fell ${m.stocks.small.worstTenthDrawdown}% or more` },
      { label: "How much they swing", value: `${m.stocks.small.medianVolatility}% a year (typical)` },
    ],
    needsDemat: true,
    singleCompany: true,
    risks: ["Small companies can fall 50% or more, and some never recover.", "Favourite targets of pump-and-dump tips.", "Less information is available about them."],
    concepts: ["diversification", "drawdown", "volatility", "pump_dump"],
    sources: [NSE_PRICES],
    uses: "market",
  },
];

function assess(d: Def, p: Profile, today: string): OptionResult {
  const reasons: Reason[] = [];
  const add = (tone: Tone, text: string) => reasons.push({ tone, text });
  const minYears = HORIZON_MIN_YEARS[p.horizon];
  const when = HORIZON_TEXT[p.horizon];
  const fall = Math.abs(d.worstFall);
  const atStake = p.mode === "once" ? p.amount : p.amount * 12;
  const atStakeText = p.mode === "once" ? `your ${inr(p.amount)}` : `a year of ${inr(p.amount)}/month (${inr(atStake)})`;
  const shares = d.singleCompany || d.id === "nifty50" || d.id === "midsmall" || d.id === "gold";

  // Affordability
  if (d.monthlyOnly && p.mode === "once") add("caution", "This is built for saving a fixed amount every month, not a one-time sum.");
  if (p.amount < d.minimum && d.minimumIsFirm) add("mismatch", `${inr(p.amount)} is below the minimum. ${sentence(d.minimumText)}`);
  else if (p.amount < d.minimum) add("caution", `${inr(p.amount)} may be below the starting amount for some. ${sentence(d.minimumText)}`);
  else if (d.minimum <= 1000) add("good", `You can start small. ${sentence(d.minimumText.split(";")[0])}`);

  // Time: lock-ins and market falls
  if (d.lockYears > minYears) {
    if (d.id === "ppf" && p.horizon === "5plus") add("caution", "PPF locks money for 15 years, with partial withdrawals only from year 7. That's longer than 5 years.");
    else if (d.id === "fd" && p.horizon === "lt1") add("caution", "You'd pick a 1-year deposit; taking it out before a year earns a lower rate, and not at all in the first 6 months.");
    else add("mismatch", `You need this money ${when}, but it's locked: ${d.lockText.toLowerCase()}.`);
  }
  if (d.marketLinked && fall >= 10) {
    if (minYears < 3) add("mismatch", `You need the money ${when}. In the past year this fell up to ${fall}% at its worst, and a fall may not recover in time.`);
    else if (minYears < 5) add("caution", `Over ${when.replace("in ", "")}, there's some time to wait out falls, but recovery isn't guaranteed.`);
    else add("good", "You have 5+ years, which gives more time to wait out falls. Recovery still isn't guaranteed.");
  }

  // Comfort with falls
  if (d.marketLinked && fall > 0) {
    const loss = inr((atStake * fall) / 100);
    if (p.risk === "low" && fall >= 10) add("mismatch", `You said a fall would worry you. A ${fall}% fall like the past year's worst would be about ${loss} on ${atStakeText}.`);
    else if (p.risk === "medium" && fall >= 25) add("caution", `A ${fall}% fall like the past year's worst would be about ${loss} on ${atStakeText}. That's more than a small dip.`);
    else if (fall >= 10) add("caution", `A ${fall}% fall like the past year's worst would be about ${loss} on ${atStakeText}.`);
  }
  if (!d.marketLinked) add("good", "The amount you put in doesn't go down with the market; the interest rate is fixed when you invest.");

  // Goal
  if (p.goal === "emergency") {
    if (d.lockYears === 0 && fall < 5) add("good", "Easy to get at quickly, which is what an emergency fund needs.");
    else if (d.lockYears > 0 && d.id !== "fd") add("mismatch", "An emergency fund needs money you can get at any time. This locks it up.");
    else if (fall >= 5) add("mismatch", "An emergency fund shouldn't be able to fall in value just when you need it.");
  }
  if ((p.goal === "wealth" || p.horizon === "5plus") && (d.id === "savings" || d.id === "liquid")) {
    add("caution", d.id === "savings"
      ? `Over 5+ years, ${ss.rates.savings}% interest may not keep up with rising prices (inflation).`
      : "Meant for parking money for days or months, not for long-term growth.");
  }
  if (p.goal === "learn" && d.marketLinked && d.minimum <= p.amount) add("good", "You can start small and learn how prices move.");

  // Safety net and experience
  if (p.emergencyFund !== "yes" && d.marketLinked && fall >= 10) {
    add("caution", `${p.emergencyFund === "no" ? "You don't have an emergency fund yet" : "You're not sure you have an emergency fund"}. Many beginners set aside 3–6 months of expenses somewhere safe before putting money into shares.`);
  }
  if (d.singleCompany) {
    if (p.experience !== "stocks") add("caution", "Picking single companies needs research skills. Funds spread your money across many companies for you.");
    if (atStake < 50_000) add("caution", `With ${inr(atStake)} you could only own a few companies, so one bad company would hurt a lot.`);
  }
  if (d.needsDemat && p.experience === "none") add("caution", "You'd need a demat and trading account with a broker first.");
  if (shares && fall < 10 && d.marketLinked) add("caution", "Past-year falls were small, but shares and gold can fall much more in other years.");

  const mismatch = reasons.some((r) => r.tone === "mismatch");
  const cautions = reasons.filter((r) => r.tone === "caution").length;
  reasons.sort((a, b) => ["mismatch", "caution", "good"].indexOf(a.tone) - ["mismatch", "caution", "good"].indexOf(b.tone));

  const indicators: Indicator[] = [
    d.returnIndicator,
    ...(d.extra ?? []),
    {
      label: "Potential loss on your money",
      value: d.marketLinked ? `About ${inr((atStake * fall) / 100)} on ${atStakeText}` : "None from market moves",
      note: d.marketLinked ? `If it fell ${fall}% like the past year's worst. Bigger falls are possible.` : "Early withdrawal can cost you interest.",
    },
    { label: "Getting your money out", value: d.liquidity },
    { label: "Lock-in", value: d.lockText },
    { label: "Spread of risk", value: d.diversification },
    d.costs,
    { label: "Minimum to start", value: d.minimumText },
  ];

  const stale =
    d.uses === "savings" && today > ss.validUntil
      ? `These government rates were for ${ss.quarter} and may have changed. Check the latest rates.`
      : d.uses === "market" && daysBetween(m.asOf, today) > 10
        ? `Market data is from ${m.asOf}, more than 10 days old.`
        : null;

  return {
    id: d.id,
    name: d.name,
    kind: d.kind,
    what: d.what,
    verdict: mismatch ? "not_now" : cautions >= 2 ? "tradeoffs" : "lines_up",
    reasons,
    indicators,
    risks: d.risks,
    concepts: d.concepts,
    sources: d.sources,
    stale,
  };
}

const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

export function buildPlan(p: Profile, today = new Date().toISOString().slice(0, 10)): PlanResult {
  const order = { lines_up: 0, tradeoffs: 1, not_now: 2 };
  const options = DEFS.map((d) => assess(d, p, today)).sort((a, b) => order[a.verdict] - order[b.verdict]);
  return {
    options,
    data: { marketFrom: m.from, marketAsOf: m.asOf, savingsQuarter: ss.quarter, savingsValidUntil: ss.validUntil },
    basis:
      "Grouped by simple, fixed rules applied to your answers: lock-ins vs your time frame, past-year falls vs your time and comfort with losses, starting amounts vs your budget, and your goal. Not a recommendation.",
  };
}
