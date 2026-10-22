import nse from "@/data/nse_companies.json";
import nseSize from "@/data/nse_size.json";
import type { CompanyMatch, CompanySize } from "./types";

const SIZES: Record<string, { size: string; industry: string }> = nseSize.symbols;

// Company size and industry from NSE's index lists. Not in any = outside the top 500.
function withSize(symbol: string, name: string, score: number): CompanyMatch {
  const s = SIZES[symbol];
  return { symbol, name, score, size: (s?.size as CompanySize) ?? "very_small", industry: s?.industry || null };
}

// Matches the names in a tip to NSE's list of listed companies.
// Plain lookup, not AI: the company has to be exactly right.

const STOP_WORDS = new Set(["limited", "ltd", "the", "and", "india", "of", "co", "company", "corporation", "corp", "&"]);

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9& ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w));

const COMPANIES = nse.companies.map((c) => ({ ...c, words: words(c.name), squashed: words(c.name).join("") }));

function score(mention: string, c: (typeof COMPANIES)[number]): number {
  const m = mention.trim();
  const mWords = words(m);
  if (!mWords.length) return 0;
  const squashed = mWords.join("");

  if (m.replace(/\s+/g, "").toUpperCase() === c.symbol) return 100;
  if (squashed === c.squashed) return 95;
  // Every word of the mention starts a word of the company name, in order: "Tata Motors" -> "Tata Motors Limited"
  if (mWords.every((w, i) => c.words[i]?.startsWith(w))) return 80 - Math.max(0, c.words.length - mWords.length) * 3;
  const shared = mWords.filter((w) => w.length > 2 && c.words.includes(w)).length;
  if (shared) return Math.round((shared / Math.max(mWords.length, c.words.length)) * 60);
  return 0;
}

export function matchCompanies(mentions: string[]): CompanyMatch[] {
  const best = new Map<string, CompanyMatch>();
  for (const mention of mentions) {
    for (const c of COMPANIES) {
      const s = score(mention, c);
      if (s >= 40 && s > (best.get(c.symbol)?.score ?? 0)) best.set(c.symbol, withSize(c.symbol, c.name, s));
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 4);
}

export function companyBySymbol(symbol: string): CompanyMatch | null {
  const c = COMPANIES.find((x) => x.symbol === symbol);
  return c ? withSize(c.symbol, c.name, 100) : null;
}
