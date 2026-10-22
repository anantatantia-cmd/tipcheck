"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { OptionResult, PlanResult, Profile, Reason } from "@/lib/plan";
import { CONCEPTS } from "@/lib/planConcepts";

const SEBI_IA_LIST = "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecognisedFpi=yes&intmId=13";
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

type Choice<V extends string> = { value: V; label: string; hint?: string };
type ChoiceStep<K extends keyof Profile> = { key: K; ask: string; help?: string; choices: Choice<Profile[K] & string>[] };

const CHOICE_STEPS = [
  {
    key: "mode",
    ask: "Is that a one-time amount, or something you'd put in every month?",
    choices: [
      { value: "once", label: "One-time" },
      { value: "monthly", label: "Every month" },
    ],
  },
  {
    key: "goal",
    ask: "What's this money for?",
    choices: [
      { value: "emergency", label: "🛟 Emergency fund", hint: "money for surprises" },
      { value: "short", label: "🎯 Something specific", hint: "a laptop, a trip, fees" },
      { value: "wealth", label: "🌱 Grow it long-term" },
      { value: "learn", label: "📚 Start small and learn" },
    ],
  },
  {
    key: "horizon",
    ask: "When might you need this money back?",
    choices: [
      { value: "lt1", label: "Within a year" },
      { value: "1to3", label: "In 1–3 years" },
      { value: "3to5", label: "In 3–5 years" },
      { value: "5plus", label: "Not for 5+ years" },
    ],
  },
  {
    key: "risk",
    ask: "Say you put in ₹10,000 and a month later it's worth ₹8,000. What would you most likely do?",
    help: "There's no right answer. Falls like this happen in the stock market.",
    choices: [
      { value: "low", label: "😰 Panic and take it out" },
      { value: "medium", label: "😬 Worry, but wait" },
      { value: "high", label: "😌 Stay calm, it's long-term" },
    ],
  },
  {
    key: "experience",
    ask: "Have you invested before?",
    choices: [
      { value: "none", label: "Never" },
      { value: "some", label: "A bit", hint: "FD, mutual fund or SIP" },
      { value: "stocks", label: "I've bought shares" },
    ],
  },
  {
    key: "emergencyFund",
    ask: "Last one: do you have savings set aside for emergencies (about 3–6 months of expenses)?",
    choices: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unsure", label: "Not sure" },
    ],
  },
] as const satisfies readonly ChoiceStep<keyof Profile>[];

const TOTAL = 1 + CHOICE_STEPS.length;
const AMOUNT_CHIPS = [500, 2000, 10000, 50000];

function Bot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="mt-1 inline-block h-6 w-6 shrink-0 rounded-full bg-emerald-600" aria-hidden />
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#f2f2ef] px-4 py-3">{children}</div>
    </div>
  );
}

function Me({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-black px-4 py-3 text-white">{children}</div>
    </div>
  );
}

function labelFor(key: keyof Profile, value: Profile[keyof Profile]) {
  if (key === "amount") return inr(value as number);
  const step = CHOICE_STEPS.find((s) => s.key === key);
  return step?.choices.find((c) => c.value === value)?.label ?? String(value);
}

// ---------- The conversation ----------

function Chat({ onDone }: { onDone: (p: Profile) => void }) {
  const [answers, setAnswers] = useState<Partial<Profile>>({});
  const [amountText, setAmountText] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const step = answers.amount === undefined ? 0 : 1 + CHOICE_STEPS.findIndex((s) => answers[s.key] === undefined);
  const current = step > 0 ? CHOICE_STEPS[step - 1] : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);

  function setAmount(n: number) {
    if (!Number.isFinite(n) || n < 100 || n > 10_000_000) {
      setAmountError("Enter an amount between ₹100 and ₹1,00,00,000.");
      return;
    }
    setAmountError(null);
    setAnswers({ amount: Math.round(n) });
  }

  function choose(key: keyof Profile, value: string) {
    const next = { ...answers, [key]: value } as Partial<Profile>;
    setAnswers(next);
    if (CHOICE_STEPS.every((s) => next[s.key] !== undefined)) onDone(next as Profile);
  }

  function back() {
    if (step === 0) return;
    const prevKey = step === 1 ? "amount" : CHOICE_STEPS[step - 2].key;
    const next = { ...answers };
    delete next[prevKey];
    setAnswers(next);
  }

  const answered: (keyof Profile)[] = ["amount", ...CHOICE_STEPS.map((s) => s.key)].filter((k) => answers[k as keyof Profile] !== undefined) as (keyof Profile)[];

  return (
    <section aria-label="Questions" className="space-y-3">
      <Bot>
        <p>Hi! I&apos;ll ask 7 quick questions, then show how the usual options compare for you, with real data.</p>
        <p className="mt-2 text-sm text-black/60">
          This is education, not advice. TipCheck isn&apos;t a SEBI-registered investment adviser, so it won&apos;t tell you what to
          buy. Your answers are used only to work out your results and aren&apos;t saved; the short summary is written by Google&apos;s Gemini AI.
        </p>
      </Bot>
      <Bot>How much money are you thinking about?</Bot>
      {answered.map((k, i) => (
        <div key={k} className="space-y-3">
          <Me>{labelFor(k, answers[k]!)}</Me>
          {i + 1 < TOTAL && answered[i + 1] !== undefined && <Bot>{CHOICE_STEPS[i].ask}</Bot>}
        </div>
      ))}
      {current && (
        <Bot>
          <p>{current.ask}</p>
          {"help" in current && <p className="mt-1 text-sm text-black/55">{current.help}</p>}
        </Bot>
      )}

      <div ref={endRef} className="sticky bottom-0 -mx-4 border-t border-black/5 bg-white/95 px-4 pb-4 pt-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs text-black/50">
          <span>
            Question {Math.min(step + 1, TOTAL)} of {TOTAL}
          </span>
          {step > 0 && (
            <button type="button" onClick={back} className="underline">
              ← Change last answer
            </button>
          )}
        </div>
        {step === 0 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAmount(Number(amountText.replace(/[₹,\s]/g, "")));
            }}
          >
            <ul className="mb-2 flex flex-wrap gap-2">
              {AMOUNT_CHIPS.map((n) => (
                <li key={n}>
                  <button type="button" onClick={() => setAmount(n)} className="rounded-full px-4 py-2 text-sm ring-1 ring-black/15 hover:bg-black/5">
                    {inr(n)}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="amount">
                Amount in rupees
              </label>
              <input
                id="amount"
                inputMode="numeric"
                placeholder="Or type an amount, e.g. 3000"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                className="min-w-0 flex-1 rounded-full border border-black/15 px-4 py-2.5"
              />
              <button type="submit" className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white">
                Next
              </button>
            </div>
            {amountError && (
              <p role="alert" className="mt-2 text-sm text-red-800">
                {amountError}
              </p>
            )}
          </form>
        ) : (
          current && (
            <ul className="flex flex-wrap gap-2">
              {current.choices.map((c) => (
                <li key={c.value}>
                  <button
                    type="button"
                    onClick={() => choose(current.key, c.value)}
                    className="rounded-2xl px-4 py-2.5 text-left text-sm ring-1 ring-black/15 hover:bg-black/5"
                  >
                    {c.label}
                    {"hint" in c && c.hint && <span className="block text-xs text-black/50">{c.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}

// ---------- Results ----------

const GROUPS = [
  { verdict: "lines_up", title: "Lines up with your answers", icon: "✓", tone: "text-emerald-800" },
  { verdict: "tradeoffs", title: "Has trade-offs for you", icon: "!", tone: "text-amber-800" },
  { verdict: "not_now", title: "Doesn't line up right now", icon: "✗", tone: "text-black/60" },
] as const;

const REASON_STYLE: Record<Reason["tone"], { icon: string; label: string; cls: string }> = {
  good: { icon: "✓", label: "Fits", cls: "text-emerald-800" },
  caution: { icon: "!", label: "Watch out", cls: "text-amber-800" },
  mismatch: { icon: "✗", label: "Doesn't fit", cls: "text-red-800" },
};

function OptionCard({ o }: { o: OptionResult }) {
  return (
    <li className="rounded-2xl p-5 ring-1 ring-black/10">
      <p className="text-xs uppercase tracking-wide text-black/45">{o.kind}</p>
      <h4 className="mt-1 text-lg font-semibold">{o.name}</h4>
      <p className="mt-1 text-sm text-black/70">{o.what}</p>
      {o.stale && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
          <span aria-hidden>⚠ </span>
          <span className="font-medium">Possibly out of date: </span>
          {o.stale}
        </p>
      )}
      <ul className="mt-3 space-y-1.5 text-sm">
        {o.reasons.map((r) => (
          <li key={r.text} className="flex gap-2">
            <span aria-hidden className={`w-4 shrink-0 font-bold ${REASON_STYLE[r.tone].cls}`}>
              {REASON_STYLE[r.tone].icon}
            </span>
            <span>
              <span className={`font-medium ${REASON_STYLE[r.tone].cls}`}>{REASON_STYLE[r.tone].label}: </span>
              {r.text}
            </span>
          </li>
        ))}
      </ul>
      <details className="mt-4 rounded-xl bg-[#f7f7f5] p-3 text-sm">
        <summary className="cursor-pointer font-medium">The numbers, risks and sources</summary>
        <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[11rem_1fr]">
          {o.indicators.map((i) => (
            <div key={i.label} className="contents">
              <dt className="text-black/55">{i.label}</dt>
              <dd>
                <span className={i.unavailable ? "italic text-black/60" : "font-medium"}>{i.value}</span>
                {i.note && <span className="block text-xs text-black/50">{i.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 font-medium">Key risks</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {o.risks.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-4 font-medium">Sources</p>
        <ul className="mt-1 space-y-1">
          {o.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                {s.label}
              </a>{" "}
              <span className="text-xs text-black/50">({s.date === "check live" ? "official site, check live" : `data as of ${s.date}`})</span>
            </li>
          ))}
        </ul>
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        {o.concepts.map((c) => (
          <details key={c} className="group text-sm">
            <summary className="cursor-pointer list-none rounded-full px-3 py-1 ring-1 ring-black/15 group-open:bg-black group-open:text-white">
              <span aria-hidden>? </span>
              {CONCEPTS[c].title}
            </summary>
            <p className="mt-2 max-w-md rounded-xl bg-[#f7f7f5] p-3">
              {CONCEPTS[c].text}{" "}
              <Link href={{ pathname: "/ask", query: { q: `Explain ${CONCEPTS[c].title} simply` } }} className="underline">
                Ask a follow-up
              </Link>
            </p>
          </details>
        ))}
      </div>
    </li>
  );
}

function Summary({ profile }: { profile: Profile }) {
  const key = JSON.stringify(profile);
  const [state, setState] = useState<{ key: string; summary?: string; think_about?: string[]; error?: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/plan/summary", { method: "POST", headers: { "content-type": "application/json" }, body: `{"profile":${key}}` })
      .then((r) => r.json())
      .then((d) => live && setState(d.ok ? { key, summary: d.summary, think_about: d.think_about } : { key, error: d.error }))
      .catch(() => live && setState({ key, error: "Couldn't load the summary." }));
    return () => {
      live = false;
    };
  }, [key]);

  const s = state?.key === key ? state : null;
  return (
    <section aria-live="polite" className="rounded-2xl bg-black p-5 text-white">
      <p className="text-xs uppercase tracking-wide text-white/50">AI summary of your results</p>
      {!s ? (
        <p className="mt-2 animate-pulse text-white/70">Putting your results into plain words…</p>
      ) : s.error ? (
        <p className="mt-2 text-white/70">The AI summary isn&apos;t available right now. Everything below is complete without it.</p>
      ) : (
        <>
          <p className="mt-2 leading-relaxed">{s.summary}</p>
          {s.think_about && s.think_about.length > 0 && (
            <>
              <p className="mt-4 text-sm font-medium text-white/70">Questions to ask yourself</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-white/90">
                {s.think_about.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-3 text-xs text-white/50">Written by AI from the numbers below only. It can make mistakes; the cards are the source of truth.</p>
        </>
      )}
    </section>
  );
}

function Results({ profile, plan, onRestart }: { profile: Profile; plan: PlanResult; onRestart: () => void }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-black/60">
          {inr(profile.amount)} {profile.mode === "monthly" ? "a month" : "one-time"} · {labelFor("goal", profile.goal)} ·{" "}
          {labelFor("horizon", profile.horizon)}
        </p>
        <button type="button" onClick={onRestart} className="rounded-full px-4 py-2 text-sm ring-1 ring-black/15 hover:bg-black/5">
          ↺ Start over
        </button>
      </div>

      <Summary profile={profile} />

      <p className="text-xs text-black/55">
        Market numbers: end-of-day NSE and AMFI data, {plan.data.marketFrom} to {plan.data.marketAsOf} (not live). Government
        rates: {plan.data.savingsQuarter}. Past returns don&apos;t predict future returns, and nothing here is guaranteed.
      </p>

      {GROUPS.map((g) => {
        const list = plan.options.filter((o) => o.verdict === g.verdict);
        if (!list.length) return null;
        return (
          <section key={g.verdict} aria-labelledby={`g-${g.verdict}`}>
            <h3 id={`g-${g.verdict}`} className={`text-xl font-semibold ${g.tone}`}>
              <span aria-hidden>{g.icon} </span>
              {g.title} <span className="text-base font-normal text-black/45">({list.length})</span>
            </h3>
            <ul className="mt-3 space-y-3">
              {list.map((o) => (
                <OptionCard key={o.id} o={o} />
              ))}
            </ul>
          </section>
        );
      })}

      <details className="rounded-2xl p-5 ring-1 ring-black/10 text-sm">
        <summary className="cursor-pointer font-medium">How we grouped these</summary>
        <p className="mt-2 text-black/70">{plan.basis}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-black/70">
          <li>If money is locked for longer than you said you can wait, it doesn&apos;t line up.</li>
          <li>If it fell 10% or more at its worst in the past year and you need the money within 3 years, it doesn&apos;t line up.</li>
          <li>If you said a fall would make you panic, anything that fell 10% or more doesn&apos;t line up.</li>
          <li>An emergency fund needs money you can get at quickly that doesn&apos;t fall.</li>
          <li>Two or more &ldquo;watch out&rdquo; points puts an option under trade-offs.</li>
        </ul>
        <p className="mt-2 text-black/70">There&apos;s no hidden score, and we never rank one option as best.</p>
      </details>

      <section className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-950 ring-1 ring-emerald-200">
        <p className="font-medium">Want a personal recommendation?</p>
        <p className="mt-1">
          Only a SEBI-registered investment adviser can tell you exactly what to buy and how much. Check any adviser&apos;s
          registration on{" "}
          <a href={SEBI_IA_LIST} target="_blank" rel="noreferrer" className="underline">
            SEBI&apos;s list
          </a>{" "}
          before paying them. Got a tip from someone? <Link href="/check" className="underline">Check it here</Link>.
        </p>
      </section>
    </div>
  );
}

export default function PlanView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<{ key: string; plan?: PlanResult; error?: string } | null>(null);
  const key = profile ? JSON.stringify(profile) : "";

  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: `{"profile":${key}}` })
      .then((r) => r.json())
      .then((d) => live && setResult(d.ok ? { key, plan: d } : { key, error: d.error }))
      .catch(() => live && setResult({ key, error: "Something went wrong, please try again." }));
    return () => {
      live = false;
    };
  }, [key]);

  const restart = () => {
    setProfile(null);
    setRun((r) => r + 1);
  };

  if (!profile) return <Chat key={run} onDone={setProfile} />;
  const r = result?.key === key ? result : null;
  if (!r) return <div className="h-40 animate-pulse rounded-2xl bg-black/[.04]" aria-label="Working out your results" />;
  if (r.error || !r.plan)
    return (
      <div role="alert" className="rounded-2xl bg-amber-50 p-5 text-amber-950 ring-1 ring-amber-200">
        <p>{r.error}</p>
        <button type="button" onClick={restart} className="mt-3 rounded-full bg-black px-4 py-2 text-sm text-white">
          Start over
        </button>
      </div>
    );
  return <Results profile={profile} plan={r.plan} onRestart={restart} />;
}
