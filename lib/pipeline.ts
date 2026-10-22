import { ApiError } from "@google/genai";
import { AIRefusedError, cardGivesAdvice, readTip, SETUP_MESSAGE, writeCard, type CardText, type Extraction } from "./ai";
import { companyBySymbol, matchCompanies } from "./companies";
import { containsAdvice } from "./noAdvice";
import { findRedFlags } from "./redFlags";
import { scoreRisk } from "./risk";
import { checkSource } from "./sebi";
import type { Card, CheckBody, CompanyMatch, RedFlag, RiskLevel, SourceCheck } from "./types";
import { NOT_A_TIP_MESSAGE, UNREADABLE_IMAGE_MESSAGE, type ImageType } from "./validateInput";

// The TipCheck pipeline as five steps. The n8n workflow calls them one by one over HTTP
// (app/api/steps/[step]); runLocal() runs the same steps in-process as a fallback.
//
//   read (Gemini) -> checks (code) -> write (Gemini + word check) -> advice (Gemini) -> assemble (code)

export const SOMETHING_WRONG = "Something went wrong, please try again.";

export type ReadResult =
  | { ok: true; extraction: Extraction }
  | { ok: false; error: string; readText?: string; status: number };

export type ChecksResult = {
  company: CompanyMatch | null;
  alternatives: CompanyMatch[];
  source: SourceCheck;
  flags: RedFlag[];
  risk: RiskLevel;
  readText: string;
  facts: {
    claim: string;
    promised_return: string | null;
    timeframe: string | null;
    company: { name: string; nse_symbol: string; industry: string | null; size: string } | null;
    source: SourceCheck;
    red_flags: { kind: string; label: string; quote: string | null }[];
    risk_level: RiskLevel;
  };
};

export type WriteResult = { ok: true; text: CardText | null } | { ok: false; error: string; status: number };

// Step 1 (AI): read the tip or screenshot into structured facts.
export async function readStep(text: string, image: { data: string; mediaType: ImageType } | null): Promise<ReadResult> {
  try {
    const extraction = await readTip(text, image);
    // A blank or unreadable screenshot with no pasted text: nothing to check.
    if (image && !text && !extraction.full_text.trim()) return { ok: false, error: UNREADABLE_IMAGE_MESSAGE, status: 400 };
    if (!extraction.is_stock_tip) {
      return { ok: false, error: NOT_A_TIP_MESSAGE, readText: extraction.full_text || text, status: 400 };
    }
    return { ok: true, extraction };
  } catch (err) {
    return { ok: false, ...errorToBody(err) };
  }
}

// Step 2 (code): company, source and red flags, then the risk score.
export function checksStep(extraction: Extraction, userText: string, chosenSymbol?: string): ChecksResult {
  const texts = [userText, extraction.full_text];

  // Company: plain lookup against the NSE list.
  const matches = matchCompanies(extraction.company_mentions);
  const company = chosenSymbol ? companyBySymbol(chosenSymbol) : (matches[0] ?? null);
  const alternatives = matches.filter((m) => m.symbol !== company?.symbol).slice(0, 3);

  // Red flags: word rules plus the phrases Gemini picked out.
  const flags: RedFlag[] = findRedFlags(texts, {
    urgency: extraction.urgency_phrases,
    moneyOrId: extraction.money_or_id_requests,
  });
  if (!extraction.company_mentions.length) {
    flags.push({ kind: "no_company", label: "Doesn't name the company", serious: true, quote: null });
  } else if (!company) {
    flags.push({
      kind: "company_not_listed",
      label: "We couldn't find this company on the NSE list",
      serious: true,
      quote: extraction.company_mentions[0],
    });
  } else if (company.size === "very_small") {
    // Pump-and-dump tips usually push tiny, thinly traded companies.
    flags.push({
      kind: "very_small_company",
      label: "Very small company (outside India's top 500 listed companies)",
      serious: false,
      quote: null,
    });
  }

  // Source: lookup in the saved SEBI register.
  const source = checkSource(extraction.source_handle_or_name, texts);
  if (source.status === "reg_number_not_found") {
    flags.push({
      kind: "fake_registration",
      label: "Quotes a SEBI number that isn't in SEBI's register",
      serious: true,
      quote: source.regNo,
    });
  } else if (source.status === "name_match") {
    flags.push({
      kind: "name_only_match",
      label: "Uses a SEBI-registered adviser's name, but shows no registration number",
      serious: false,
      quote: source.name,
    });
  } else if (source.status === "unverified") {
    flags.push({
      kind: "unverified_source",
      label: "We couldn't verify who is giving this tip",
      serious: true,
      quote: source.shownAs,
    });
  }

  const risk = scoreRisk(flags).level;
  return {
    company,
    alternatives,
    source,
    flags,
    risk,
    readText: extraction.full_text || userText,
    // Gemini writes the plain-language text from these facts only.
    facts: {
      claim: extraction.claim,
      promised_return: extraction.promised_return,
      timeframe: extraction.timeframe,
      company: company
        ? { name: company.name, nse_symbol: company.symbol, industry: company.industry, size: company.size }
        : null,
      source,
      red_flags: flags.map(({ kind, label, quote }) => ({ kind, label, quote })),
      risk_level: risk,
    },
  };
}

const cardLines = (t: CardText) => [t.claim_plain, t.company_line, t.risk_reason, ...t.flag_lines.map((l) => l.line)];

// Step 3 (AI + word check): write the card text. Rewrite once if it reads like advice;
// text: null means "use the fixed safe text".
export async function writeStep(facts: ChecksResult["facts"]): Promise<WriteResult> {
  try {
    for (const strict of [false, true]) {
      const text = await writeCard(facts, strict);
      if (!containsAdvice(cardLines(text))) return { ok: true, text };
    }
    return { ok: true, text: null };
  } catch (err) {
    return { ok: false, ...errorToBody(err) };
  }
}

// Step 4 (AI): second safety check for implied advice. If the check itself is
// unavailable (Gemini busy), rely on the word check rather than failing the card.
export async function adviceStep(text: CardText | null): Promise<{ gives_advice: boolean }> {
  if (!text) return { gives_advice: false };
  const gives_advice = await cardGivesAdvice(cardLines(text)).catch((err) => {
    console.error("advice check unavailable:", err instanceof ApiError ? `ApiError ${err.status}` : "error");
    return false;
  });
  return { gives_advice };
}

// Step 5 (code): put the card together.
export function assembleStep(checks: ChecksResult, text: CardText | null): Card {
  const t: CardText = text ?? {
    claim_plain: checks.facts.claim,
    company_line: "We couldn't confirm what this company does.",
    flag_lines: [],
    risk_reason: `We rated this ${checks.risk} from the red flags below.`,
  };
  return {
    risk: checks.risk,
    riskReason: t.risk_reason,
    claim: t.claim_plain,
    company: checks.company,
    companyLine: checks.company ? t.company_line : "No company we could match.",
    alternatives: checks.alternatives,
    source: checks.source,
    flags: checks.flags.map((f) => ({ ...f, explanation: t.flag_lines.find((l) => l.kind === f.kind)?.line })),
    readText: checks.readText,
  };
}

// Steps 3-5 together, used by the fallback and by "Not this company?".
export async function writeAndAssemble(checks: ChecksResult): Promise<{ body: CheckBody; status: number }> {
  let written = await writeStep(checks.facts);
  if (!written.ok) return { body: { ok: false, error: written.error }, status: written.status };
  // If the second check flags implied advice, rewrite once more, then use safe text.
  if ((await adviceStep(written.text)).gives_advice) {
    written = await writeStep(checks.facts);
    const stillAdvice = written.ok && (await adviceStep(written.text)).gives_advice;
    if (!written.ok || stillAdvice) written = { ok: true, text: null };
  }
  return { body: { ok: true, card: assembleStep(checks, written.text), extraction: null }, status: 200 };
}

// The whole pipeline in-process: the fallback when n8n isn't set up or doesn't answer.
export async function runLocal(
  text: string,
  image: { data: string; mediaType: ImageType } | null,
): Promise<{ body: CheckBody; status: number }> {
  const read = await readStep(text, image);
  if (!read.ok) return { body: { ok: false, error: read.error, readText: read.readText }, status: read.status };
  const result = await writeAndAssemble(checksStep(read.extraction, text));
  if (result.body.ok) result.body.extraction = read.extraction;
  return result;
}

// Turns any error into a plain message for the user. Logs only the type and status.
export function errorToBody(err: unknown): { error: string; status: number } {
  console.error("check failed:", err instanceof ApiError ? `ApiError ${err.status}` : err);
  if (err instanceof ApiError) {
    // The key looks right but Google rejects it (revoked, typo, API not enabled).
    // Gemini reports a bad key as 400 "API key not valid", or as 401/403.
    if (err.status === 401 || err.status === 403 || (err.status === 400 && /api key/i.test(err.message))) {
      return { error: SETUP_MESSAGE, status: 503 };
    }
    if (err.status === 429) return { error: "TipCheck is busy right now. Please try again in a minute.", status: 503 };
  }
  if (err instanceof AIRefusedError) {
    return { error: "We couldn't check this one. Try pasting just the tip message.", status: 422 };
  }
  return { error: SOMETHING_WRONG, status: 502 };
}
