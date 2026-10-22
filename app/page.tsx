import Link from "next/link";
import Checker from "@/components/Checker";

const SEBI_SURVEY = "https://www.sebi.gov.in/sebi_data/commondocs/jan-2026/Investor%20Survey%202025%20Main%20Report.pdf";
const CFA_STUDY =
  "https://blogs.cfainstitute.org/marketintegrity/2026/08/24/indias-finfluencer-challenge-from-influence-to-accountability/";

const TOOLS = [
  { href: "/plan", icon: "🧭", title: "Where could my money go?", text: "Answer 7 quick questions and see how savings, deposits, PPF, funds, ETFs and stocks line up with your goal and comfort with risk. Real data, no advice." },
  { href: "/stocks", icon: "🔎", title: "Stock risk check", text: "Search any NSE stock and see how much it swings, how far it has fallen and how actively it trades, explained simply." },
  { href: "/compare", icon: "⚖️", title: "Compare two stocks", text: "Put two companies side by side and see which looks steadier on each measure. No overall “winner”." },
  { href: "/check", icon: "🧪", title: "Hype vs Facts", text: "Paste a tip or a post. We separate facts from hype, check claims against NSE and SEBI data, and flag scams." },
  { href: "/ask", icon: "💬", title: "Ask anything", text: "What's a P/E ratio? Is an IPO safe? Short, plain-English answers to beginner questions." },
  { href: "/learn", icon: "🎓", title: "Learn in 5 minutes", text: "Bite-size lessons, a quiz and myth-busting cards on risk, diversification and compounding." },
  { href: "/watchlist", icon: "⭐", title: "Watchlist & practice portfolio", text: "Save stocks to watch, and try “what if I had invested?” with pretend money." },
];

const STATS = [
  { value: "62%", text: "of Indian investors act on finfluencer tips", source: "SEBI Investor Survey 2025", href: SEBI_SURVEY },
  { value: "3 of 48", text: "finfluencers studied were SEBI-registered", source: "CFA Institute, 2026", href: CFA_STUDY },
  { value: "6 min", text: "median research before buying a stock", source: "NYU / NBER study", href: "https://www.investopedia.com/investors-tend-to-be-impulse-buyers-11745450" },
];

// Today's workflow vs the TipCheck workflow.
const TODAY = [
  "A tip arrives on Instagram, Telegram, WhatsApp or as an unsolicited message.",
  "Ask strangers on Reddit (r/IndianStockMarket, r/IndiaStocks) or friends “is this legit?” and wait for replies.",
  "Search SEBI registration, price history and the company by hand, or skip it entirely.",
  "Decide on impulse in about 6 minutes and act on a broker app like Zerodha Kite or Groww.",
];

const WITH_TIPCHECK = [
  { title: "Paste or upload", text: "Paste the tip text or upload a screenshot. Hinglish is fine." },
  { title: "Confirm the company", text: "Check the matched NSE-listed company, and switch it with one tap if it's wrong." },
  { title: "We check the facts", text: "SEBI registration, red-flag rules and a risk score, all done automatically." },
  { title: "Read and decide", text: "A plain-language card in under a minute. Your call, with no buy or sell advice given." },
];

// What actually runs behind the checker.
const PIPELINE = [
  { stage: "Input", what: "Tip text or a screenshot, in a Next.js web app on Vercel. Bad input is stopped before any AI call." },
  { stage: "AI", what: "Google Gemini reads the tip and extracts the stock, the claim and target, the timeframe, the source and urgency language as JSON. It also writes the final card." },
  { stage: "Logic", what: "Plain code matches the company to NSE's list, checks the source against SEBI's register, runs red-flag rules, and scores risk from the facts (registration, red flags, company size)." },
  { stage: "Action", what: "One server route runs every step in order, then two safety checks (a word check and a second Gemini pass) make sure the card gives no buy or sell advice." },
  { stage: "Output", what: "The reality-check card: the claim, the company in plain words, SEBI status, red flags quoted word for word, and the risk level." },
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
    <div className="flex flex-col">
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

        {/* The tools */}
        <section className="mx-auto max-w-6xl px-5 pt-16">
          <h2 className="font-serif text-4xl md:text-5xl">What you can do</h2>
          <p className="mt-3 max-w-2xl text-black/60">Free tools for first-time investors. Real NSE and SEBI data, explained in plain words. No buy or sell calls.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="group block h-full rounded-2xl p-5 ring-1 ring-black/10 transition hover:ring-black/30 focus-visible:outline-2 focus-visible:outline-black">
                  <span className="text-2xl" aria-hidden>{t.icon}</span>
                  <h3 className="mt-3 text-lg font-semibold">{t.title} <span className="text-black/40 transition group-hover:translate-x-0.5" aria-hidden>→</span></h3>
                  <p className="mt-1 text-sm text-black/65">{t.text}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* The job, and today's workflow vs TipCheck's */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">The job to be done</p>
          <h2 className="mt-2 max-w-4xl text-balance font-serif text-3xl leading-tight md:text-4xl">
            When a stock tip lands on social media or in a chat, I want to check the source and the stock fast, so I can avoid
            getting scammed without spending hours on research.
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl bg-[#f7f7f5] p-6 md:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-black/50">Today</h3>
              <ol className="mt-5 space-y-4">
                {TODAY.map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/10 text-sm font-semibold text-black/60">
                      {i + 1}
                    </span>
                    <p className="text-black/70">{t}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-sm text-black/50">Slow, unreliable, and usually skipped.</p>
            </div>

            <div className="rounded-3xl bg-emerald-50 p-6 ring-1 ring-emerald-100 md:p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-800">With TipCheck</h3>
              <ol className="mt-5 space-y-4">
                {WITH_TIPCHECK.map((s, i) => (
                  <li key={s.title} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <p>
                      <strong>{s.title}.</strong> <span className="text-black/70">{s.text}</span>
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-sm text-emerald-900/70">About a minute, start to finish.</p>
            </div>
          </div>
        </section>

        {/* Under the hood: Input -> AI -> Logic -> Action -> Output */}
        <section className="border-t border-black/5 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-serif text-4xl md:text-5xl">Under the hood</h2>
            <p className="mt-3 max-w-2xl text-black/60">
              AI reads and explains. Plain code checks every fact that has to be exact. You make the decision.
            </p>
            <ol className="mt-10 grid gap-4 md:grid-cols-5">
              {PIPELINE.map((p, i) => (
                <li key={p.stage} className="relative rounded-2xl p-5 ring-1 ring-black/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Step {i + 1}</p>
                  <h3 className="mt-1 font-serif text-2xl">{p.stage}</h3>
                  <p className="mt-2 text-sm text-black/65">{p.what}</p>
                  {i < PIPELINE.length - 1 && (
                    <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-black/30 md:block" aria-hidden>
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
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

    </div>
  );
}
