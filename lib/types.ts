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
  | "name_only_match"
  | "fake_registration"
  | "very_small_company";

export type RedFlag = {
  kind: FlagKind;
  label: string; // short title shown on the card
  quote: string | null; // exact words from the tip, when there are any
  serious: boolean;
  explanation?: string; // plain-language line written by the AI
};

// Size from NSE's indices: Nifty 100 = large, Midcap 150 = mid, Smallcap 250 = small,
// anything else listed = very small (outside the top 500).
export type CompanySize = "large" | "mid" | "small" | "very_small";

export type CompanyMatch = {
  symbol: string;
  name: string;
  score: number;
  size: CompanySize;
  industry: string | null;
};

export type SourceCheck =
  | { status: "registered"; name: string; regNo: string; type: string }
  | { status: "reg_number_not_found"; regNo: string }
  // The name matches a registered entity, but there's no number to prove it's really them.
  | { status: "name_match"; name: string; regNo: string; type: string }
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
  readText: string; // what the AI read from the tip, shown so the user can spot misreads
  claims: ClaimCheck[];
};

// One statement from the tip, sorted into fact / opinion / promotion, with what we could verify.
export type ClaimCheck = {
  text: string;
  kind: "fact" | "opinion" | "promotion";
  status: "matches" | "contradicted" | "unverified" | "not_checkable";
  evidence: string | null; // plain-language result of the check
  source: { label: string; url: string; date: string } | null;
};

export type CheckBody =
  | { ok: true; card: Card; extraction: unknown }
  | { ok: false; error: string; readText?: string };

export type CheckResponse = CheckBody & { elapsedMs: number };
