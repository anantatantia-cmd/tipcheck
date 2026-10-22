// Smoke tests for the pages and the stocks/ask APIs.
// Usage: node scripts/test-api.mjs [base URL]   (default http://localhost:3000)
// Set ASK_LIVE=1 to also send one real question to the AI explainer (uses the Gemini key).

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`✗ ${name}\n    ${err.message}`);
  }
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function get(path) {
  const res = await fetch(BASE + path);
  const body = res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text();
  return { status: res.status, body };
}

async function post(path, data) {
  const res = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

for (const page of ["/", "/plan", "/stocks", "/stocks?symbol=TCS", "/compare?a=TCS&b=INFY", "/check", "/ask", "/learn", "/watchlist"]) {
  await test(`page ${page} loads`, async () => {
    const { status } = await get(page);
    expect(status === 200, `status ${status}`);
  });
}

await test("search finds companies by name", async () => {
  const { status, body } = await get("/api/stocks?q=tata");
  expect(status === 200, `status ${status}`);
  expect(body.results.length > 0, "no results");
  expect(body.results.every((r) => r.symbol && r.name), "result missing symbol or name");
});

await test("search finds a company by symbol", async () => {
  const { body } = await get("/api/stocks?q=INFY");
  expect(body.results[0]?.symbol === "INFY", `first result was ${body.results[0]?.symbol}`);
});

await test("report has real metrics, signals and a dated source", async () => {
  const { status, body } = await get("/api/stocks?symbol=TCS");
  expect(status === 200, `status ${status}`);
  const r = body.report;
  expect(r.symbol === "TCS", "wrong symbol");
  expect(typeof r.metrics.close === "number" && r.metrics.close > 0, "no closing price");
  expect(/^\d{4}-\d{2}-\d{2}$/.test(r.metrics.asOf), `bad asOf ${r.metrics.asOf}`);
  expect(Array.isArray(r.signals), "no signals");
  expect(r.links?.nse?.startsWith("https://www.nseindia.com/"), "no NSE link");
});

await test("unknown symbol returns 404, not a made-up report", async () => {
  const { status } = await get("/api/stocks?symbol=NOTAREALSTOCK");
  expect(status === 404, `status ${status}`);
});

await test("batch returns only the real stocks", async () => {
  const { body } = await get("/api/stocks?symbols=TCS,INFY,NOTAREALSTOCK");
  expect(body.reports.map((r) => r.symbol).join(",") === "TCS,INFY", JSON.stringify(body.reports.map((r) => r.symbol)));
});

await test("stocks API without a query returns 400", async () => {
  const { status } = await get("/api/stocks");
  expect(status === 400, `status ${status}`);
});

await test("price series is served for the chart", async () => {
  const { status, body } = await get("/series/TCS.json");
  expect(status === 200, `status ${status}`);
  const series = typeof body === "string" ? JSON.parse(body) : body;
  expect(Array.isArray(series) && series.length > 20, "series too short");
});

await test("explainer rejects a too-short question", async () => {
  const { status, body } = await post("/api/ask", { question: "a" });
  expect(status === 400 && body?.ok === false, `status ${status}`);
});

await test("explainer rejects a missing body", async () => {
  const res = await fetch(BASE + "/api/ask", { method: "POST", body: "not json" });
  expect(res.status === 400, `status ${res.status}`);
});

const SHORT_TERM = { amount: 2000, mode: "once", goal: "emergency", horizon: "lt1", risk: "low", experience: "none", emergencyFund: "no" };
const LONG_TERM = { amount: 5000, mode: "monthly", goal: "wealth", horizon: "5plus", risk: "high", experience: "some", emergencyFund: "yes" };
const byId = (plan) => Object.fromEntries(plan.options.map((o) => [o.id, o]));

await test("planner: short-term emergency money keeps market-linked options out", async () => {
  const { status, body } = await post("/api/plan", { profile: SHORT_TERM });
  expect(status === 200 && body.ok, `status ${status}`);
  const o = byId(body);
  for (const id of ["nifty50", "midsmall", "gold", "largestock", "smallstock", "ppf"]) expect(o[id].verdict === "not_now", `${id} was ${o[id].verdict}`);
  expect(o.savings.verdict === "lines_up", `savings was ${o.savings.verdict}`);
});

await test("planner: long horizon doesn't call single stocks a clean fit", async () => {
  const { body } = await post("/api/plan", { profile: LONG_TERM });
  const o = byId(body);
  expect(o.largestock.verdict !== "lines_up" && o.smallstock.verdict !== "lines_up", "single stocks marked as lining up");
  expect(o.nifty50.verdict !== "not_now", `nifty50 was ${o.nifty50.verdict}`);
});

await test("planner: every option has reasons, sources and dated data", async () => {
  const { body } = await post("/api/plan", { profile: LONG_TERM });
  expect(body.options.length >= 8, "too few options");
  for (const o of body.options) {
    expect(o.reasons.length > 0, `${o.id} has no reasons`);
    expect(o.sources.every((s) => s.url.startsWith("https://")), `${o.id} has a bad source link`);
  }
  expect(/^\d{4}-\d{2}-\d{2}$/.test(body.data.marketAsOf), "no market date");
});

await test("planner: never uses advice words in its own text", async () => {
  const { body } = await post("/api/plan", { profile: LONG_TERM });
  const text = JSON.stringify(body).toLowerCase();
  for (const w of ["you should", "we recommend", "best option", "guaranteed return", "must buy"]) expect(!text.includes(w), `found "${w}"`);
});

await test("planner: rejects out-of-range answers", async () => {
  const { status } = await post("/api/plan", { profile: { ...SHORT_TERM, amount: 5 } });
  expect(status === 400, `status ${status}`);
});

if (process.env.ASK_LIVE) {
  await test("planner summary is written without advice", async () => {
    const { status, body } = await post("/api/plan/summary", { profile: LONG_TERM });
    expect(status === 200 && body.ok, `status ${status}: ${body?.error}`);
    expect(body.summary.length > 30 && body.think_about.length === 3, "summary incomplete");
  });

  await test("explainer answers a beginner question without advice", async () => {
    const { status, body } = await post("/api/ask", { question: "What is a P/E ratio?" });
    expect(status === 200 && body.ok, `status ${status}: ${body?.error}`);
    expect(body.answer.length > 20, "answer too short");
    expect(Array.isArray(body.follow_ups), "no follow-ups");
  });
}

console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
