// Builds the price snapshot from NSE's official end-of-day files ("bhavcopy").
// Run: node scripts/fetch-prices.mjs   (about 2-3 minutes; re-run to refresh the data)
//
// Writes:
//   data/prices.json          - per-stock metrics (returns, volatility, 52-week range, drawdown, liquidity)
//   public/series/<SYM>.json  - weekly closing prices for each stock's chart
// Downloads are cached in .cache/bhav so a re-run only fetches new days.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/128 Safari/537.36";
const CACHE = ".cache/bhav";
const TRADING_DAYS = 252; // about one year
mkdirSync(CACHE, { recursive: true });

const ymd = (d) => d.toISOString().slice(0, 10).replaceAll("-", "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Collect the most recent ~252 trading days (weekends and holidays simply return 404).
const days = [];
for (let back = 0; days.length < TRADING_DAYS && back < 420; back++) {
  const d = new Date(Date.now() - back * 86400000);
  if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
  const key = ymd(d);
  const csvPath = `${CACHE}/${key}.csv`;
  if (!existsSync(csvPath) && !existsSync(`${CACHE}/${key}.none`)) {
    const url = `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${key}_F_0000.csv.zip`;
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.status === 404) {
      if (back > 3) writeFileSync(`${CACHE}/${key}.none`, ""); // remember holidays, but retry very recent days
      continue;
    }
    if (!res.ok) throw new Error(`NSE returned ${res.status} for ${key}`);
    const zip = `${CACHE}/${key}.zip`;
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    writeFileSync(csvPath, execFileSync("unzip", ["-p", zip], { maxBuffer: 64 * 1024 * 1024 }));
    rmSync(zip);
    await sleep(250); // be polite to NSE's servers
  }
  if (existsSync(csvPath)) days.push(key);
}
days.sort();
console.log(`trading days: ${days.length} (${days[0]} to ${days.at(-1)})`);

// 2. Read each day's closing price, volume and traded value for equity-series stocks.
const series = new Map(); // symbol -> [{ d, c, h, l, v }]
for (const key of days) {
  const lines = readFileSync(`${CACHE}/${key}.csv`, "utf8").split("\n");
  const head = lines[0].split(",");
  const col = (name) => head.indexOf(name);
  const [iSym, iSer, iClose, iHigh, iLow, iVal] = ["TckrSymb", "SctySrs", "ClsPric", "HghPric", "LwPric", "TtlTrfVal"].map(col);
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    if (f[iSer] !== "EQ" && f[iSer] !== "BE") continue;
    const sym = f[iSym];
    if (!series.has(sym)) series.set(sym, []);
    series.get(sym).push({ d: key, c: +f[iClose], h: +f[iHigh], l: +f[iLow], v: +f[iVal] });
  }
}

// 3. Metrics. Everything is computed from real end-of-day data; nothing is estimated.
const pct = (a, b) => (b > 0 ? +(((a - b) / b) * 100).toFixed(1) : null);
const at = (rows, tradingDaysBack) => (rows.length > tradingDaysBack ? rows[rows.length - 1 - tradingDaysBack].c : null);
const iso = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
const safe = (sym) => sym.replace(/[^A-Za-z0-9-]/g, "_");

rmSync("public/series", { recursive: true, force: true });
mkdirSync("public/series", { recursive: true });
const metrics = {};
for (const [sym, rows] of series) {
  if (rows.length < 20) continue; // too little history to say anything
  const last = rows.at(-1);
  const year = rows.slice(-TRADING_DAYS);
  const dailyReturns = year.slice(1).map((r, i) => Math.log(r.c / year[i].c)).filter(Number.isFinite);
  const mean = dailyReturns.reduce((s, x) => s + x, 0) / dailyReturns.length;
  const sd = Math.sqrt(dailyReturns.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, dailyReturns.length - 1));
  let peak = 0, maxDrawdown = 0;
  for (const r of year) {
    peak = Math.max(peak, r.c);
    maxDrawdown = Math.min(maxDrawdown, (r.c - peak) / peak);
  }
  const high52 = Math.max(...year.map((r) => r.h));
  const low52 = Math.min(...year.map((r) => r.l));
  // NSE's daily files are raw prices, not adjusted for splits and bonus issues. A one-day
  // move this large is almost always one of those, which would distort returns and drawdown,
  // so flag the stock instead of presenting the distorted numbers as real.
  const jumps = year.slice(1).map((r, i) => ({ d: r.d, x: r.c / year[i].c })).filter((j) => j.x < 0.6 || j.x > 1.8);
  const last63 = rows.slice(-63);
  const avgValueCr = last63.reduce((s, r) => s + r.v, 0) / last63.length / 1e7; // rupees -> crore
  metrics[sym] = {
    close: last.c,
    asOf: iso(last.d),
    days: year.length,
    ret1m: pct(last.c, at(rows, 21)),
    ret3m: pct(last.c, at(rows, 63)),
    ret1y: year.length >= TRADING_DAYS - 5 ? pct(last.c, year[0].c) : null,
    volatility: +(sd * Math.sqrt(252) * 100).toFixed(1), // annualised, %
    maxDrawdown: +(maxDrawdown * 100).toFixed(1),
    high52,
    low52,
    fromHigh: pct(last.c, high52),
    avgValueCr: +avgValueCr.toFixed(2),
    possibleSplit: jumps.length ? iso(jumps.at(-1).d) : null,
  };
  // Weekly closes (every 5th trading day plus the latest) for the chart.
  const weekly = year.filter((_, i) => (year.length - 1 - i) % 5 === 0).map((r) => [iso(r.d), r.c]);
  writeFileSync(`public/series/${safe(sym)}.json`, JSON.stringify(weekly));
}

writeFileSync(
  "data/prices.json",
  JSON.stringify({
    source: "NSE end-of-day bhavcopy, https://nsearchives.nseindia.com/content/cm/",
    from: iso(days[0]),
    asOf: iso(days.at(-1)),
    tradingDays: days.length,
    metrics,
  }),
);
console.log(`stocks with metrics: ${Object.keys(metrics).length}`);
