// Shapes shared by the API route and the page.

export type RiskLevel = "High" | "Medium" | "Low";

export type FlagKind =
  | "guaranteed_return"
  | "accuracy_claim"
  | "id_request"
  | "outside_site"
  | "big_return"
  | "urgency"
  | "paid_group"
  | "no_company"
  | "company_not_listed"
  | "unverified_source"
  | "fake_registration";

export type RedFlag = {
  kind: FlagKind;
  label: string; // short title shown on the card
  quote: string | null; // exact words from the tip, when there are any
  serious: boolean;
  explanation?: string; // plain-language line written by Claude
};

export type CompanyMatch = { symbol: string; name: string; score: number };

export type SourceCheck =
  | { status: "registered"; name: string; regNo: string; type: string }
  | { status: "reg_number_not_found"; regNo: string }
  | { status: "unverified"; shownAs: string | null };

export type Card = {
  risk: RiskLevel;
  riskReason: string;
  claim: string;
  company: CompanyMatch | null;
  companyLine: string;
  alternatives: CompanyMatch[];
  source: SourceCheck;
  flags: RedFlag[];
  readText: string; // what Claude read from the tip, shown so the user can spot misreads
};

export type CheckBody =
  | { ok: true; card: Card; extraction: unknown }
  | { ok: false; error: string; readText?: string };

export type CheckResponse = CheckBody & { elapsedMs: number };
