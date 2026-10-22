// Builds the data behind the investment planner (/plan): one record per kind of investment,
// with real numbers and where they came from. Nothing is estimated or filled in by hand
// except the government savings rates, which are copied from the official quarterly notice.
// Run after scripts/fetch-prices.mjs (it reuses that script's NSE files and data/prices.json):
//   node scripts/fetch-options.mjs
//
// Sources:
//   NSE index closing files   https://nsearchives.nseindia.com/content/indices/ind_close_all_DDMMYYYY.csv
//   NSE daily price files     .cache/bhav (from fetch-prices.mjs), for gold ETFs
//   AMFI NAV list             https://portal.amfiindia.com/spages/NAVAll.txt  (which schemes exist, by category)
//   mfapi.in                  https://api.mfapi.in/mf/<code>  (NAV history, republished from AMFI)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/128 Safari/537.36";
const IDX_CACHE = ".cache/idx";
mkdirSync(IDX_CACHE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
const round = (x, d = 1) => (x === null || !Number.isFinite(x) ? null : +x.toFixed(d));
const median = (xs) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
const percentile = (xs, p) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null;
};

// A one-day move this large is a unit split or NAV re-denomination, not a real gain or loss
// (the files aren't adjusted for them), so such series are left out rather than distorting the numbers.
const hasJump = (points) => points.slice(1).some((p, i) => p[1] / points[i][1] < 0.6 || p[1] / points[i][1] > 1.8);

// Return, volatility and worst fall over a list of [date, value] points (oldest first, daily).
function stats(points) {
  const v = points.map((p) => p[1]);
  const daily = v.slice(1).map((x, i) => Math.log(x / v[i])).filter(Number.isFinite);
  const mean = daily.reduce((s, x) => s + x, 0) / daily.length;
  const sd = Math.sqrt(daily.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, daily.length - 1));
  let peak = 0, dd = 0;
  for (const x of v) {
    peak = Math.max(peak, x);
    dd = Math.min(dd, (x - peak) / peak);
  }
  return {
    ret1y: round(((v.at(-1) - v[0]) / v[0]) * 100),
    volatility: round(sd * Math.sqrt(252) * 100),
    maxDrawdown: round(dd * 100),
    from: points[0][0],
    asOf: points.at(-1)[0],
  };
}

// 1. Index history from NSE's daily index files, for the same trading days as the price files.
const days = readdirSync(".cache/bhav").filter((f) => f.endsWith(".csv")).map((f) => f.slice(0, 8)).sort().slice(-252);
const INDICES = ["Nifty 50", "Nifty Midcap 150", "Nifty Smallcap 250"];
const indexSeries = Object.fromEntries(INDICES.map((n) => [n, []]));
const indexPE = {};
for (const key of days) {
  const file = `${IDX_CACHE}/${key}.csv`;
  if (!existsSync(file)) {
    const ddmmyyyy = key.slice(6, 8) + key.slice(4, 6) + key.slice(0, 4);
    const res = await fetch(`https://nsearchives.nseindia.com/content/indices/ind_close_all_${ddmmyyyy}.csv`, { headers: { "user-agent": UA } });
    if (!res.ok) {
      console.warn(`index file missing for ${key} (${res.status})`);
      continue;
    }
    writeFileSync(file, await res.text());
    await sleep(200);
  }
  for (const line of readFileSync(file, "utf8").split("\n").slice(1)) {
    const f = line.split(",");
    if (!INDICES.includes(f[0])) continue;
    const series = indexSeries[f[0]];
    if (series.at(-1)?.[0] === iso(key)) continue; // some files list an index twice
    series.push([iso(key), +f[5]]);
    if (f[10] && f[10] !== "-") indexPE[f[0]] = +f[10];
  }
}
const indexStats = Object.fromEntries(INDICES.map((n) => [n, { ...stats(indexSeries[n]), pe: indexPE[n] ?? null }]));
console.log("indices:", indexStats);

// 2. Gold ETFs: every exchange-traded fund whose NSE name mentions gold, from the daily price files.
const gold = new Map(); // symbol -> [[date, close, value]]
for (const key of days) {
  const lines = readFileSync(`.cache/bhav/${key}.csv`, "utf8").split("\n");
  const head = lines[0].split(",");
  const [iSym, iIsin, iName, iClose, iVal] = ["TckrSymb", "ISIN", "FinInstrmNm", "ClsPric", "TtlTrfVal"].map((c) => head.indexOf(c));
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    if (!f[iIsin]?.startsWith("INF") || !/GOLD/i.test(f[iName]) || /SILVER/i.test(f[iName])) continue;
    if (!gold.has(f[iSym])) gold.set(f[iSym], []);
    gold.get(f[iSym]).push([iso(key), +f[iClose], +f[iVal]]);
  }
}
const goldStats = [...gold.values()]
  .filter((rows) => rows.length >= 240 && rows.slice(-63).reduce((s, r) => s + r[2], 0) / 63 > 1e6) // a full year, and actively traded
  .filter((rows) => !hasJump(rows.map((r) => [r[0], r[1]])))
  .map((rows) => ({ ...stats(rows.map((r) => [r[0], r[1]])), unitPrice: rows.at(-1)[1] }));
console.log(`gold ETFs used: ${goldStats.length}`);

// 3. Liquid mutual funds: every direct-plan growth option in AMFI's "Liquid Fund" category.
const navAll = await (await fetch("https://portal.amfiindia.com/spages/NAVAll.txt", { headers: { "user-agent": UA } })).text();
let category = "";
const liquidCodes = [];
for (const line of navAll.split("\n")) {
  if (/^Open Ended Schemes\(/.test(line.trim())) category = line.trim();
  const f = line.split(";");
  if (category.includes("Liquid Fund") && f.length >= 6 && /Direct/i.test(f[3] + f[4]) && /growth/i.test(f[5] ?? f[3]) && !/IDCW|bonus/i.test(f[3] + f[5])) {
    liquidCodes.push(f[0]);
  }
}
const liquidStats = [];
for (const code of liquidCodes) {
  const res = await fetch(`https://api.mfapi.in/mf/${code}`);
  if (!res.ok) continue;
  const data = (await res.json()).data; // newest first, dates as DD-MM-YYYY
  const points = data.map((d) => [d.date.split("-").reverse().join("-"), +d.nav]).reverse();
  const end = points.at(-1);
  const yearAgo = new Date(new Date(end[0]).getTime() - 365 * 86400000).toISOString().slice(0, 10);
  const year = points.filter((p) => p[0] >= yearAgo);
  if (year.length < 200 || year[0][0] > new Date(new Date(yearAgo).getTime() + 7 * 86400000).toISOString().slice(0, 10)) continue;
  // Liquid funds hold very short-term debt and barely move day to day; a one-day move over 5%
  // is a NAV re-denomination or a data error, not something the category actually does.
  if (year.slice(1).some((p, i) => Math.abs(p[1] / year[i][1] - 1) > 0.05)) {
    console.warn(`skipped liquid fund ${code}: one-day NAV move over 5%`);
    continue;
  }
  liquidStats.push(stats(year));
  await sleep(100);
}
console.log(`liquid funds used: ${liquidStats.length} of ${liquidCodes.length}`);

// 4. Single stocks, by company size, from the NSE price metrics already built by fetch-prices.mjs.
const prices = JSON.parse(readFileSync("data/prices.json", "utf8"));
const sizes = JSON.parse(readFileSync("data/nse_size.json", "utf8")).symbols;
function stockGroup(size) {
  const ms = Object.entries(prices.metrics)
    .filter(([sym, m]) => sizes[sym]?.size === size && !m.possibleSplit && m.ret1y !== null)
    .map(([, m]) => m);
  return {
    count: ms.length,
    medianRet1y: round(median(ms.map((m) => m.ret1y))),
    medianVolatility: round(median(ms.map((m) => m.volatility))),
    medianDrawdown: round(median(ms.map((m) => m.maxDrawdown))),
    worstTenthDrawdown: round(percentile(ms.map((m) => m.maxDrawdown), 0.1)), // 1 in 10 stocks fell at least this much
    shareOfRisers: round((ms.filter((m) => m.ret1y > 0).length / ms.length) * 100, 0),
    medianPrice: round(median(ms.map((m) => m.close)), 0),
  };
}

const category1 = (list) => ({
  count: list.length,
  medianRet1y: round(median(list.map((s) => s.ret1y))),
  lowRet1y: round(percentile(list.map((s) => s.ret1y), 0.1)), // 9 in 10 did at least this well
  highRet1y: round(percentile(list.map((s) => s.ret1y), 0.9)),
  medianVolatility: round(median(list.map((s) => s.volatility)), 2),
  worstDrawdown: round(Math.min(...list.map((s) => s.maxDrawdown)), 2),
  asOf: list.map((s) => s.asOf).sort().at(-1),
});

writeFileSync(
  "data/options.json",
  JSON.stringify(
    {
      built: new Date().toISOString().slice(0, 10),
      market: {
        from: iso(days[0]),
        asOf: iso(days.at(-1)),
        indices: indexStats,
        goldEtfs: { ...category1(goldStats), medianUnitPrice: round(median(goldStats.map((g) => g.unitPrice)), 0) },
        liquidFunds: category1(liquidStats),
        stocks: { large: stockGroup("large"), small: stockGroup("small") },
      },
      // Government small savings rates are set every quarter by the Ministry of Finance.
      // Update these by hand from the next notice (the planner flags them once validUntil passes).
      smallSavings: {
        quarter: "1 October – 31 December 2026",
        validUntil: "2026-12-31",
        source: "Ministry of Finance (Department of Economic Affairs) quarterly rates, as reported on 30 Sep 2026",
        url: "https://www.businesstoday.in/personal-finance/story/small-savings-scheme-interest-rates-unchanged-for-q3-fy27-check-ppf-scss-ssy-rates-558892-2026-09-30",
        officialUrl: "https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=89",
        rates: { savings: 4.0, td1: 6.9, td2: 7.0, td3: 7.1, td5: 7.5, rd5: 6.7, ppf: 7.1 },
      },
    },
    null,
    1,
  ),
);
console.log("wrote data/options.json");
