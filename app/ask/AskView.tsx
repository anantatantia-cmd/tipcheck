"use client";

import { useRef, useState } from "react";

type Turn = { q: string; answer: string; example: string; follow_ups: string[] };

const SUGGESTED = [
  "What is a stock, in simple words?",
  "What does P/E ratio mean?",
  "Is an IPO a guaranteed way to make money?",
  "What is diversification?",
  "Why do people say “don't time the market”?",
  "How do I check if a tipster is SEBI-registered?",
];

export default function AskView() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (q.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    setInput("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, history: turns.slice(-3).map((t) => ({ q: t.q, a: t.answer })) }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error ?? "Something went wrong, please try again.");
      else setTurns((t) => [...t, { q, answer: data.answer, example: data.example, follow_ups: data.follow_ups ?? [] }].slice(-10));
    } catch {
      setError("Something went wrong, please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const last = turns.at(-1);

  return (
    <div className="space-y-6">
      {turns.length === 0 && (
        <section aria-labelledby="suggest-h">
          <h2 id="suggest-h" className="text-sm font-medium text-black/60">Try one of these</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => ask(s)} disabled={loading} className="rounded-full px-4 py-2 text-left text-sm ring-1 ring-black/15 hover:bg-black/5 disabled:opacity-50">
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol className="space-y-5" aria-live="polite">
        {turns.map((t, i) => (
          <li key={i} className="space-y-3">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-black px-4 py-2.5 text-white">{t.q}</p>
            <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#f7f7f5] p-4">
              <p>{t.answer}</p>
              {t.example && (
                <p className="mt-3 rounded-xl bg-white p-3 text-sm text-black/75 ring-1 ring-black/5">
                  <strong>Example:</strong> {t.example}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {loading && <p className="text-sm text-black/55">Thinking… (a few seconds)</p>}
      {error && (
        <p role="alert" className="rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
          {error}
        </p>
      )}

      {last && last.follow_ups.length > 0 && !loading && (
        <section aria-labelledby="follow-h">
          <h2 id="follow-h" className="text-sm font-medium text-black/60">Ask next</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {last.follow_ups.map((f) => (
              <li key={f}>
                <button type="button" onClick={() => ask(f)} className="rounded-full px-4 py-2 text-left text-sm ring-1 ring-black/15 hover:bg-black/5">
                  {f}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-3 flex gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/10"
      >
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <input
          ref={inputRef}
          id="ask-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
          placeholder="e.g. What is a mutual fund?"
          className="min-w-0 flex-1 rounded-xl px-3 py-2 outline-none"
        />
        <button type="submit" disabled={loading || input.trim().length < 3} className="rounded-xl bg-black px-4 py-2 font-medium text-white disabled:opacity-40">
          Ask
        </button>
      </form>
      {turns.length > 0 && (
        <button type="button" onClick={() => setTurns([])} className="text-sm underline text-black/55">
          Start over
        </button>
      )}
      <p className="text-xs text-black/45">Answers are written by Google Gemini and can be wrong. They&apos;re for learning, not advice.</p>
    </div>
  );
}
