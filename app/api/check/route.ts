import { ApiError } from "@google/genai";
import {
  AIRefusedError,
  apiKeyLooksValid,
  Extraction,
  readTip,
  SETUP_MESSAGE,
  writeCard,
  type CardText,
} from "@/lib/ai";
import { companyBySymbol, matchCompanies } from "@/lib/companies";
import { containsAdvice } from "@/lib/noAdvice";
import { findRedFlags } from "@/lib/redFlags";
import { scoreRisk } from "@/lib/risk";
import { checkSource } from "@/lib/sebi";
import type { Card, CheckBody, CheckResponse, RedFlag } from "@/lib/types";
import { NOT_A_TIP_MESSAGE, UNREADABLE_IMAGE_MESSAGE, validateInput } from "@/lib/validateInput";

// Two Gemini calls can take a while; give Vercel room before it times out.
export const maxDuration = 30;

const SOMETHING_WRONG = "Something went wrong, please try again.";

export async function POST(request: Request) {
  const started = Date.now();
  const reply = (body: CheckBody, status = 200) =>
    Response.json({ ...body, elapsedMs: Date.now() - started } satisfies CheckResponse, { status });

  try {
    // Mode 2: the user picked a different company under "Not this company?".
    // Reuse the tip we already read and only rewrite the card.
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json();
      const extraction = Extraction.safeParse(body?.extraction);
      if (!extraction.success || typeof body?.symbol !== "string") {
        return reply({ ok: false, error: SOMETHING_WRONG }, 400);
      }
      if (!apiKeyLooksValid()) return reply({ ok: false, error: SETUP_MESSAGE }, 503);
      const card = await buildCard(extraction.data, "", body.symbol);
      return reply({ ok: true, card, extraction: extraction.data });
    }

    // Mode 1: a new tip, as pasted text and/or a screenshot.
    const form = await request.formData();
    const checked = await validateInput(form.get("text"), form.get("image"));
    if (!checked.ok) return reply({ ok: false, error: checked.error }, 400);

    if (!apiKeyLooksValid()) return reply({ ok: false, error: SETUP_MESSAGE }, 503);

    const { text, image } = checked.input;
    const extraction = await readTip(text, image);
    // A blank or unreadable screenshot with no pasted text: nothing to check.
    if (image && !text && !extraction.full_text.trim()) {
      return reply({ ok: false, error: UNREADABLE_IMAGE_MESSAGE }, 400);
    }
    if (!extraction.is_stock_tip) {
      return reply({ ok: false, error: NOT_A_TIP_MESSAGE, readText: extraction.full_text || text }, 400);
    }

    const card = await buildCard(extraction, text);
    return reply({ ok: true, card, extraction });
  } catch (err) {
    // Log only the error type and status on the server; show the user a plain message.
    console.error("check failed:", err instanceof ApiError ? `ApiError ${err.status}` : err);
    if (err instanceof ApiError) {
      // The key looks right but Google rejects it (revoked, typo, API not enabled).
      // Gemini reports a bad key as 400 "API key not valid", or as 401/403.
      if (err.status === 401 || err.status === 403 || (err.status === 400 && /api key/i.test(err.message))) {
        return reply({ ok: false, error: SETUP_MESSAGE }, 503);
      }
      if (err.status === 429) {
        return reply({ ok: false, error: "TipCheck is busy right now. Please try again in a minute." }, 503);
      }
    }
    if (err instanceof AIRefusedError) {
      return reply({ ok: false, error: "We couldn't check this one. Try pasting just the tip message." }, 422);
    }
    return reply({ ok: false, error: SOMETHING_WRONG }, 502);
  }
}

async function buildCard(extraction: Extraction, userText: string, chosenSymbol?: string): Promise<Card> {
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
  } else if (source.status !== "registered") {
    flags.push({
      kind: "unverified_source",
      label: "We couldn't verify who is giving this tip",
      serious: true,
      quote: source.shownAs,
    });
  }

  const risk = scoreRisk(flags);

  // Gemini writes the plain-language text from these facts only.
  const facts = {
    claim: extraction.claim,
    promised_return: extraction.promised_return,
    timeframe: extraction.timeframe,
    company: company ? { name: company.name, nse_symbol: company.symbol } : null,
    source,
    red_flags: flags.map(({ kind, label, quote }) => ({ kind, label, quote })),
    risk_level: risk.level,
  };
  const text = await safeCardText(facts);

  return {
    risk: risk.level,
    riskReason: text.risk_reason,
    claim: text.claim_plain,
    company,
    companyLine: company ? text.company_line : "No company we could match.",
    alternatives,
    source,
    flags: flags.map((f) => ({ ...f, explanation: text.flag_lines.find((l) => l.kind === f.kind)?.line })),
    readText: extraction.full_text || userText,
  };
}

// Never show advice: check the wording, retry once, then fall back to fixed text.
async function safeCardText(facts: { claim: string; risk_level: string }): Promise<CardText> {
  const all = (t: CardText) => [t.claim_plain, t.company_line, t.risk_reason, ...t.flag_lines.map((l) => l.line)];
  for (const strict of [false, true]) {
    const text = await writeCard(facts, strict);
    if (!containsAdvice(all(text))) return text;
  }
  return {
    claim_plain: facts.claim,
    company_line: "We couldn't confirm what this company does.",
    flag_lines: [],
    risk_reason: `We rated this ${facts.risk_level} from the red flags below.`,
  };
}
