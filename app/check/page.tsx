import type { Metadata } from "next";
import Checker from "@/components/Checker";

export const metadata: Metadata = {
  title: "Hype vs Facts – TipCheck",
  description: "Paste a stock tip or post. TipCheck separates facts from hype, checks claims against NSE and SEBI data, and flags scam patterns.",
};

const LEGEND = [
  { label: "Fact claim", text: "Something that can be checked. We check price moves against NSE data and registration against SEBI's register." },
  { label: "Opinion / prediction", text: "A guess about the future, like “will 3x by Diwali”. Nobody can verify it." },
  { label: "Promotion", text: "Sales or pressure language, like “only 50 slots”. It tells you about the seller, not the stock." },
];

export default function CheckPage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 md:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="font-serif text-5xl leading-tight">Hype vs Facts</h1>
        <p className="mt-3 text-black/65">
          Paste a stock tip, a WhatsApp forward or an Instagram caption, or upload a screenshot. We split it into separate
          claims, check what can be checked against real data, and flag common scam patterns.
        </p>
        <ul className="mt-6 space-y-3">
          {LEGEND.map((l) => (
            <li key={l.label} className="rounded-xl bg-[#f7f7f5] p-4">
              <p className="font-medium">{l.label}</p>
              <p className="mt-1 text-sm text-black/65">{l.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-black/50">
          We never call a person or a stock a fraud. We say whether a claim matches the data, doesn&apos;t, or can&apos;t be checked.
        </p>
      </div>
      <div className="rounded-3xl bg-gradient-to-b from-emerald-50 to-white p-3 ring-1 ring-black/5 md:p-5">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5">
          <Checker />
        </div>
      </div>
    </main>
  );
}
