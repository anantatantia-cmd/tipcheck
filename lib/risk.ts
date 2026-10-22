import type { RedFlag, RiskLevel } from "./types";

// A fixed points recipe, so the same facts always give the same level.
// 4+ points = High, 2-3 = Medium, 0-1 = Low. The card never says "safe".
const POINTS: Record<RedFlag["kind"], number> = {
  unverified_source: 2,
  fake_registration: 3,
  guaranteed_return: 2,
  accuracy_claim: 2,
  id_request: 2,
  outside_site: 2,
  no_company: 2,
  company_not_listed: 2,
  big_return: 1,
  urgency: 1,
  paid_group: 1,
};

export function scoreRisk(flags: RedFlag[]): { level: RiskLevel; points: number } {
  const points = flags.reduce((sum, f) => sum + POINTS[f.kind], 0);
  return { level: points >= 4 ? "High" : points >= 2 ? "Medium" : "Low", points };
}
