import type { FlagKind, RedFlag } from "./types";

// Fixed word rules: the same tip always gives the same flags, and each flag
// keeps the exact words it matched so the card can quote them.
type Rule = { kind: FlagKind; label: string; serious: boolean; pattern: RegExp };

const RULES: Rule[] = [
  {
    kind: "guaranteed_return",
    label: "Promises a guaranteed or risk-free profit",
    serious: true,
    pattern:
      /\b(guarantee[ds]?|guaranteed|assured (?:return|profit)s?|100\s?% (?:sure|profit|safe)|risk[- ]?free|no[- ]loss|pakka (?:profit|return)|sure[- ]shot)\b/i,
  },
  {
    kind: "accuracy_claim",
    label: "Claims a high accuracy or success rate",
    serious: true,
    pattern: /\b(\d{2,3}\s?(?:-\s?\d{2,3}\s?)?%\s?(?:per\s?)?(?:accura\w*|success|hit rate)|accuracy|success rate|win rate)\b/i,
  },
  {
    kind: "id_request",
    label: "Asks for PAN, Aadhaar, OTP or bank details",
    serious: true,
    pattern: /\b(pan(?: card| number| no)?|aadha+r|otp|upi pin|bank details|kyc details|cvv)\b/i,
  },
  {
    kind: "outside_site",
    label: "Sends you to an outside site or app to pay or trade",
    serious: true,
    pattern:
      /(\brecharge\b|\binstitutional account\b|\bdeposit (?:money|funds|amount)\b|\.apk\b|https?:\/\/(?![^\s]*(?:nseindia\.com|bseindia\.com|sebi\.gov\.in))[^\s]+)/i,
  },
  {
    kind: "big_return",
    label: "Promises a very big return",
    serious: false,
    pattern:
      /(\b\d+(?:\.\d+)?\s?x\b|multi[- ]?bagger|double your money|paisa double|\b\d{2,4}\s?%\s?(?:return|profit|upside|gain)s?\b)/i,
  },
  {
    kind: "urgency",
    label: "Pushes you to act fast",
    serious: false,
    pattern:
      /\b(only \d+ (?:slots?|seats?|spots?)|limited (?:slots?|seats?|time|offer)|today only|last chance|hurry|act (?:now|fast)|book now|before it'?s too late|don'?t miss|jaldi|abhi\b|lock (?:karo|kar lo|now|in))/i,
  },
  {
    kind: "paid_group",
    label: "Pushes a paid or premium group",
    serious: false,
    pattern:
      /\b(premium|vip (?:group|channel|calls?)|paid (?:group|channel|calls?|tips?)|subscription|join (?:my |our )?(?:telegram|whatsapp|channel|group)|dm (?:me|for)|t\.me\/\S+)/i,
  },
];

export function findRedFlags(
  texts: string[],
  aiPhrases: { urgency: string[]; moneyOrId: string[] },
): RedFlag[] {
  const flags: RedFlag[] = [];
  const all = texts.filter(Boolean).join("\n");

  for (const rule of RULES) {
    const m = all.match(rule.pattern);
    if (m) flags.push({ kind: rule.kind, label: rule.label, serious: rule.serious, quote: m[0].trim() });
  }

  // Claude also reads reworded urgency and requests the rules miss
  // ("lock karo before Diwali", "send screenshot of your demat").
  const has = (k: FlagKind) => flags.some((f) => f.kind === k);
  const urgency = aiPhrases.urgency.find((p) => p.trim());
  if (urgency && !has("urgency")) {
    flags.push({ kind: "urgency", label: "Pushes you to act fast", serious: false, quote: urgency.trim() });
  }
  const ask = aiPhrases.moneyOrId.find((p) => p.trim());
  if (ask && !has("id_request") && !has("outside_site")) {
    flags.push({
      kind: "id_request",
      label: "Asks for money or personal details",
      serious: true,
      quote: ask.trim(),
    });
  }
  return flags;
}
