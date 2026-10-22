import Checker from "@/components/Checker";

const SEBI_SURVEY = "https://www.sebi.gov.in/sebi_data/commondocs/jan-2026/Investor%20Survey%202025%20Main%20Report.pdf";
const CFA_STUDY =
  "https://blogs.cfainstitute.org/marketintegrity/2026/08/24/indias-finfluencer-challenge-from-influence-to-accountability/";

const STATS = [
  { value: "62%", text: "of Indian investors act on finfluencer tips", source: "SEBI Investor Survey 2025", href: SEBI_SURVEY },
  { value: "3 of 48", text: "finfluencers studied were SEBI-registered", source: "CFA Institute, 2026", href: CFA_STUDY },
  { value: "6 min", text: "median research before buying a stock", source: "NYU / NBER study", href: "https://www.investopedia.com/investors-tend-to-be-impulse-buyers-11745450" },
];

const STEPS = [
  { n: "1", title: "Paste or upload", text: "Paste the message, or upload a screenshot from Telegram, WhatsApp or Instagram. Hinglish is fine." },
  { n: "2", title: "We check the facts", text: "The company against NSE's list, the sender against SEBI's register, and the message against common scam patterns." },
  { n: "3", title: "You decide", text: "A plain-English card with the risk level and every red flag quoted word for word. No buy or sell calls, ever." },
];

// An experienced investor's checklist: what to ask before acting on any tip.
const RULES = [
  { q: "Who is telling you this?", a: "Anyone giving stock advice for money in India must be SEBI-registered, with a number starting INH or INA. No number, no trust." },
  { q: "Is a return promised?", a: "Markets don't guarantee anything. “Sure shot”, “3x by Diwali” and “95% accuracy” are sales lines, not analysis." },
  { q: "Why the hurry?", a: "“Only 50 slots”, “today only”, “lock karo” exist to stop you thinking. A good investment is still good next week." },
  { q: "Can you name the business?", a: "If the tip hides the company (“this smallcap”) or you can't say what it sells, you're buying a story, not a business." },
  { q: "How small is it?", a: "Tiny, thinly traded companies are the easiest to pump and dump. Check if it's outside India's top 500." },
  { q: "Are they asking for money or ID?", a: "No genuine adviser needs your PAN, Aadhaar or OTP in a chat, or a “recharge” on some outside site." },
];

const FLAGS = [
  "Guaranteed or risk-free returns",
  "“90%+ accuracy” claims",
  "Requests for PAN, Aadhaar or OTP",
  "“Recharge” links and outside apps",
  "Countdown and slot pressure",
  "Paid “premium” or VIP groups",
  "Fake SEBI registration numbers",
  "Hidden or unlisted companies",
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-white text-[#0b0b0c]">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <a href="#" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-emerald-600" aria-hidden />
            tipcheck
          </a>
          <a href="#check" className="rounded-full border border-black px-4 py-1.5 text-sm font-medium hover:bg-black hover:text-white">
            Check a tip
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero + the checker */}
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-12 md:grid-cols-2 md:items-start md:pt-20">
          <div>
            <h1 className="text-balance font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
              Check the tip before you trust it
            </h1>
            <ul className="mt-8 space-y-3 text-[17px]">
              <li className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-black/5 text-sm" aria-hidden>✓</span>
                Is the sender SEBI-registered?
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-black/5 text-sm" aria-hidden>⚑</span>
                Every red flag, quoted word for word
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-black/5 text-sm" aria-hidden>⏱</span>
                A clear risk level in about 10 seconds
              </li>
            </ul>
            <p className="mt-8 max-w-md text-black/60">
              Built for first-time investors who get stock tips on Telegram, WhatsApp and Instagram. Free to use. We never tell you
              to buy or sell.
            </p>
          </div>

          <div id="check" className="scroll-mt-20 rounded-3xl bg-gradient-to-b from-emerald-50 to-white p-3 ring-1 ring-black/5 md:p-5">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5">
              <p className="mb-3 text-sm font-medium text-black/60">Got a tip? Check it here.</p>
              <Checker />
            </div>
          </div>
        </section>

        {/* Why it matters */}
        <section className="border-y border-black/5 bg-[#f7f7f5]">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.value}>
                <p className="font-serif text-5xl">{s.value}</p>
                <p className="mt-2 text-black/75">{s.text}</p>
                <a href={s.href} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-black/45 underline">
                  {s.source}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-serif text-4xl md:text-5xl">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl p-6 ring-1 ring-black/10">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-black text-sm font-semibold text-white">{s.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-black/65">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The investor's checklist */}
        <section className="bg-[#0b0b0c] text-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-serif text-4xl md:text-5xl">Six questions seasoned investors ask first</h2>
            <p className="mt-3 max-w-2xl text-white/60">
              Before money moves, experienced investors check the messenger, the promise and the business. TipCheck asks these for
              you on every tip.
            </p>
            <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
              {RULES.map((r, i) => (
                <div key={r.q} className="flex gap-4">
                  <span className="font-serif text-3xl text-emerald-400">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{r.q}</h3>
                    <p className="mt-1 text-white/65">{r.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Red flags */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-serif text-4xl md:text-5xl">Red flags we catch</h2>
          <div className="mt-8 flex flex-wrap gap-2">
            {FLAGS.map((f) => (
              <span key={f} className="rounded-full bg-red-50 px-4 py-2 text-sm text-red-900 ring-1 ring-red-100">
                {f}
              </span>
            ))}
          </div>
          <a href="#check" className="mt-10 inline-flex rounded-full bg-black px-7 py-3 font-medium text-white hover:bg-black/85">
            Check a tip now →
          </a>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-[#f7f7f5]">
        <div className="mx-auto max-w-6xl space-y-2 px-5 py-8 text-xs text-black/50">
          <p>
            <strong className="text-black/70">TipCheck is not investment advice</strong> and is not a SEBI-registered adviser. It
            never tells you to buy, sell or hold. Always check a registration number yourself at sebi.gov.in.
          </p>
          <p>
            Company data: NSE listed companies and index lists. Adviser data: SEBI register of Research Analysts and Investment
            Advisers. Both saved 22 Oct 2026. Tips are read by Google Gemini.
          </p>
        </div>
      </footer>
    </div>
  );
}
