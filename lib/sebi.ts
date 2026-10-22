import sebi from "@/data/sebi_registered.json";
import type { SourceCheck } from "./types";

// Looks up the tip-giver in a saved copy of SEBI's register of Research
// Analysts and Investment Advisers. A miss means "couldn't verify", never "fraud".

const REG_NO = /\bIN[AH]\d{9}\b/i;
const BY_REG = new Map(sebi.entries.map((e) => [e.regNo.toUpperCase(), e]));

export function checkSource(source: string | null, texts: string[]): SourceCheck {
  const regMatch = [source ?? "", ...texts].join("\n").match(REG_NO);
  if (regMatch) {
    const regNo = regMatch[0].toUpperCase();
    const entry = BY_REG.get(regNo);
    return entry ? { status: "registered", ...entry } : { status: "reg_number_not_found", regNo };
  }
  // A name alone proves little (anyone can type a registered adviser's name),
  // so only a registration number counts as verified.
  return { status: "unverified", shownAs: source?.trim() || null };
}

export const SEBI_FETCHED = sebi.fetched;
