// Sends every case in evals/tips.json to the running app and prints pass/fail.
// Usage: npm run dev (in one terminal), then npm run eval [base URL]
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const { cases } = JSON.parse(readFileSync("evals/tips.json", "utf8"));

// Same advice check the app uses (lib/noAdvice.ts), so the eval catches anything that slips through.
const ADVICE =
  /\b(you should|we recommend|i recommend|we suggest|consider (?:buying|selling|investing)|go ahead and (?:buy|sell|invest)|(?:do not|don't) (?:buy|sell|invest)|safe to (?:buy|invest)|(?:a )?(?:good|great|safe) (?:buy|investment|time to buy)|worth (?:buying|investing)|book (?:your )?profits?)\b|(?:^|[.!?]\s+)(?:buy|sell|hold|avoid|invest)\b/i;

let failed = 0;
for (const c of cases) {
  const form = new FormData();
  form.set("text", c.text ?? "");
  if (c.image) form.set("image", new Blob([readFileSync(`evals/${c.image}`)], { type: "image/png" }), c.image);
  if (c.file) form.set("image", new Blob([new Uint8Array(c.file.bytes)], { type: c.file.type }), c.file.name);

  const started = Date.now();
  const res = await fetch(`${BASE}/api/check`, { method: "POST", body: form });
  // On Vercel, uploads over 4.5 MB are rejected with a plain-text 413 before the route runs.
  // The page turns that into the same "too big" message, so score it the way a user sees it.
  const body = await res.text();
  let data;
  if (res.status === 413) data = { ok: false, error: "That screenshot is too big. Please use one under 4 MB. (host 413)" };
  else {
    try {
      data = JSON.parse(body);
    } catch {
      // A crash or timeout returns plain text; record it as a failure instead of stopping the run.
      data = { ok: false, error: `host error ${res.status}: ${body.slice(0, 80)}` };
    }
  }
  const seconds = (Date.now() - started) / 1000;
  const e = c.expect;
  const problems = [];

  if (data.ok !== e.ok) problems.push(`ok=${data.ok} (wanted ${e.ok})${data.error ? `: ${data.error}` : ""}`);
  if (e.maxSeconds && seconds > e.maxSeconds) problems.push(`took ${seconds.toFixed(1)}s (limit ${e.maxSeconds}s)`);
  if (e.error && data.error !== e.error) problems.push(`error was "${data.error}"`);
  if (e.errorIncludes && !data.error?.includes(e.errorIncludes)) problems.push(`error was "${data.error}"`);

  if (data.ok) {
    const card = data.card;
    const kinds = card.flags.map((f) => f.kind);
    if (e.risk && card.risk !== e.risk) problems.push(`risk ${card.risk} (wanted ${e.risk})`);
    if (e.minFlags && card.flags.length < e.minFlags) problems.push(`${card.flags.length} flags (wanted ${e.minFlags}+)`);
    for (const k of e.flagKinds ?? []) if (!kinds.includes(k)) problems.push(`missing flag ${k}`);
    if (e.source && card.source.status !== e.source) problems.push(`source ${card.source.status} (wanted ${e.source})`);
    if (e.symbolIn && !e.symbolIn.includes(card.company?.symbol)) problems.push(`company ${card.company?.symbol ?? "none"} (wanted ${e.symbolIn.join("/")})`);
    if (e.hasAlternatives && !card.alternatives.length) problems.push("no 'Not this company?' alternatives");
    const words = [card.claim, card.companyLine, card.riskReason, ...card.flags.map((f) => f.explanation ?? "")];
    if (words.some((w) => ADVICE.test(w))) problems.push("card text reads like advice");
  }

  if (problems.length) failed++;
  console.log(`${problems.length ? "FAIL" : "PASS"}  test ${c.test}  ${c.id}  (${seconds.toFixed(1)}s)${problems.length ? "\n      " + problems.join("\n      ") : ""}`);
  if (data.ok) console.log(`      ${data.card.risk} | ${data.card.company?.symbol ?? "no company"} | ${data.card.flags.map((f) => f.kind).join(", ")}`);
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
