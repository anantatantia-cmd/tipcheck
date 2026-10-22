import { z } from "zod";
import { apiKeyLooksValid, explain, SETUP_MESSAGE } from "@/lib/ai";
import { containsAdvice } from "@/lib/noAdvice";
import { errorToBody } from "@/lib/pipeline";

// POST /api/ask { question, history? } -> { ok, answer, example, follow_ups }
// The beginner explainer. Runs on the server so the Gemini key never reaches the browser.
export const maxDuration = 60;

const Body = z.object({
  question: z.string().trim().min(3).max(300),
  history: z.array(z.object({ q: z.string().max(300), a: z.string().max(1200) })).max(4).default([]),
});

const SAFE_FALLBACK = {
  answer:
    "I can explain how investing works, but I can't tell you what to buy or sell. A good start is understanding risk, spreading your money across many companies (diversification), and checking that any adviser is SEBI-registered.",
  example: "Instead of putting all ₹1,000 of your savings into one friend's food stall, you might split it across several stalls, so one bad day doesn't wipe you out.",
  follow_ups: ["What is diversification?", "What is an index fund?", "How do I check if an adviser is SEBI-registered?"],
};

export async function POST(request: Request) {
  const input = Body.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json({ ok: false, error: "Please type a question between 3 and 300 characters." }, { status: 400 });
  }
  if (!apiKeyLooksValid()) return Response.json({ ok: false, error: SETUP_MESSAGE }, { status: 503 });

  try {
    // Never give advice: check the wording, rewrite once, then use a safe fixed answer.
    for (const strict of [false, true]) {
      const e = await explain(input.data.question, input.data.history, strict);
      if (!containsAdvice([e.answer, e.example])) return Response.json({ ok: true, ...e });
    }
    return Response.json({ ok: true, ...SAFE_FALLBACK });
  } catch (err) {
    const { error, status } = errorToBody(err);
    return Response.json({ ok: false, error }, { status });
  }
}
