import type { Card, CompanyMatch, CompanySize, SourceCheck } from "@/lib/types";

const SIZE_LABEL: Record<CompanySize, string> = {
  large: "Large company (Nifty 100)",
  mid: "Mid-size company (Nifty Midcap 150)",
  small: "Small company (Nifty Smallcap 250)",
  very_small: "Very small company (outside the top 500)",
};

const RISK_STYLE = {
  High: "bg-red-600 text-white",
  Medium: "bg-amber-500 text-black",
  Low: "bg-emerald-600 text-white",
} as const;

const RISK_LABEL = { High: "High risk", Medium: "Medium risk", Low: "Low risk signals found" } as const;

function sourceText(s: SourceCheck): { ok: boolean; text: string } {
  switch (s.status) {
    case "registered":
      return { ok: true, text: `SEBI-registered ${s.type}: ${s.name} (${s.regNo}). Being registered doesn't make every tip right.` };
    case "reg_number_not_found":
      return { ok: false, text: `The tip quotes SEBI number ${s.regNo}, but it isn't in SEBI's register.` };
    case "name_match":
      return {
        ok: false,
        text: `The name matches SEBI-registered ${s.name} (${s.regNo}), but the tip shows no registration number, and anyone can use a name. Ask for their number and check it on sebi.gov.in.`,
      };
    case "unverified":
      return {
        ok: false,
        text: `Couldn't verify${s.shownAs ? ` "${s.shownAs}"` : " who sent this"}: no SEBI registration number we could find in SEBI's list of registered advisers and research analysts. Ask for their number and check it on sebi.gov.in.`,
      };
  }
}

// Shows what the AI read from the tip, so the user can spot a misread screenshot.
export function WhatWeRead({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer underline">What we read</summary>
      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-black/10 dark:border-white/15 p-3 opacity-80">{text}</p>
      <p className="mt-1 text-xs opacity-60">Read by AI. If this doesn&apos;t match your message, paste the text instead.</p>
    </details>
  );
}

export default function TipCard({
  card,
  onPickCompany,
  picking,
}: {
  card: Card;
  onPickCompany: (c: CompanyMatch) => void;
  picking: boolean;
}) {
  const source = sourceText(card.source);

  return (
    <article className="rounded-2xl border border-black/10 dark:border-white/15 overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 p-5 border-b border-black/10 dark:border-white/15">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${RISK_STYLE[card.risk]}`}>{RISK_LABEL[card.risk]}</span>
        <p className="text-sm opacity-80">{card.riskReason}</p>
      </header>

      <section className="p-5 space-y-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">What they&apos;re claiming</h3>
          <p className="mt-1 text-lg">{card.claim}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">The company</h3>
          {card.company ? (
            <>
              <p className="mt-1">
                <strong>{card.company.name}</strong> <span className="opacity-60">(NSE: {card.company.symbol})</span>
              </p>
              <p className="mt-1 text-sm opacity-70">
                {SIZE_LABEL[card.company.size]}
                {card.company.industry ? ` · ${card.company.industry}` : ""}
              </p>
            </>
          ) : null}
          <p className="mt-1 opacity-80">
            {card.companyLine}
            {card.company && <span className="ml-1 text-xs opacity-70">(AI summary – may be out of date)</span>}
          </p>
          {card.alternatives.length > 0 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer underline">Not this company?</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {card.alternatives.map((c) => (
                  <button
                    key={c.symbol}
                    disabled={picking}
                    onClick={() => onPickCompany(c)}
                    className="rounded-full border border-black/20 dark:border-white/25 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
                  >
                    {c.name} ({c.symbol})
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">Who&apos;s behind it</h3>
          <p className={`mt-1 ${source.ok ? "" : "text-red-700 dark:text-red-400"}`}>{source.text}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">
            Red flags ({card.flags.length})
          </h3>
          {card.flags.length === 0 ? (
            <p className="mt-1 opacity-80">We didn&apos;t find any of the red flags we look for.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {card.flags.map((f) => (
                <li key={f.kind} className="rounded-lg bg-black/[.04] dark:bg-white/[.06] p-3">
                  <p className="font-medium">
                    {f.serious ? "⚠️ " : "• "}
                    {f.label}
                  </p>
                  {f.quote && <p className="mt-1 text-sm italic opacity-80">&ldquo;{f.quote}&rdquo;</p>}
                  {f.explanation && <p className="mt-1 text-sm opacity-80">{f.explanation}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <WhatWeRead text={card.readText} />
      </section>

      <footer className="px-5 py-3 text-xs opacity-60 border-t border-black/10 dark:border-white/15">
        This is not investment advice. TipCheck doesn&apos;t tell you to buy or sell.
      </footer>
    </article>
  );
}
