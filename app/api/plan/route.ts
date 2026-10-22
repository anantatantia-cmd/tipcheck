import { buildPlan, Profile } from "@/lib/plan";

// POST /api/plan { profile } -> the planner's results, computed by fixed rules from real data.
// No AI here, so it's instant and works even when Gemini is busy.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const profile = Profile.safeParse(body?.profile);
  if (!profile.success) return Response.json({ ok: false, error: "Some answers are missing or out of range. Please start again." }, { status: 400 });
  return Response.json({ ok: true, ...buildPlan(profile.data) });
}
