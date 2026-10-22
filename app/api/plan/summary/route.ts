import { apiKeyLooksValid, SETUP_MESSAGE, summarisePlan } from "@/lib/ai";
import { containsAdvice } from "@/lib/noAdvice";
import { errorToBody } from "@/lib/pipeline";
import { buildPlan, Profile } from "@/lib/plan";

// POST /api/plan/summary { profile } -> { summary, think_about }
// The results are recomputed here from the answers (never taken from the browser), and Gemini
// only puts them into plain words. Advice-like wording is retried once, then dropped.
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const profile = Profile.safeParse(body?.profile);
  if (!profile.success) return Response.json({ ok: false, error: "Some answers are missing or out of range." }, { status: 400 });
  if (!apiKeyLooksValid()) return Response.json({ ok: false, error: SETUP_MESSAGE }, { status: 503 });

  const plan = buildPlan(profile.data);
  const facts = {
    answers: profile.data,
    results: plan.options.map((o) => ({
      name: o.name,
      group: o.verdict,
      reasons: o.reasons.map((r) => `${r.tone}: ${r.text}`),
      past_year: o.indicators[0] ? `${o.indicators[0].label}: ${o.indicators[0].value}` : null,
    })),
  };
  try {
    for (const strict of [false, true]) {
      const s = await summarisePlan(facts, strict);
      if (!containsAdvice([s.summary, ...s.think_about])) return Response.json({ ok: true, ...s });
    }
    return Response.json({ ok: false, error: "We couldn't write a summary this time. The results above are complete." }, { status: 200 });
  } catch (err) {
    const { error, status } = errorToBody(err);
    return Response.json({ ok: false, error }, { status });
  }
}
