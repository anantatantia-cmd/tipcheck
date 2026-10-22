"use client";

import { useRef, useState } from "react";
import TipCard, { WhatWeRead } from "@/components/TipCard";
import type { Card, CheckResponse, CompanyMatch } from "@/lib/types";

export default function Home() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorReadText, setErrorReadText] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [extraction, setExtraction] = useState<unknown>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function send(init: RequestInit) {
    setLoading(true);
    setError(null);
    setErrorReadText("");
    const started = Date.now();
    try {
      const res = await fetch("/api/check", { method: "POST", ...init });
      const data = (await res.json()) as CheckResponse;
      if (data.ok) {
        setCard(data.card);
        setExtraction(data.extraction);
      } else {
        setCard(null);
        setError(data.error);
        setErrorReadText(data.readText ?? "");
      }
    } catch {
      setCard(null);
      setError("Something went wrong, please try again.");
    } finally {
      setElapsedMs(Date.now() - started);
      setLoading(false);
    }
  }

  function check() {
    const form = new FormData();
    form.set("text", text);
    if (image) form.set("image", image);
    send({ body: form });
  }

  function pickCompany(c: CompanyMatch) {
    send({ headers: { "content-type": "application/json" }, body: JSON.stringify({ extraction, symbol: c.symbol }) });
  }

  function clearImage() {
    setImage(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function reset() {
    setText("");
    clearImage();
    setCard(null);
    setError(null);
    setElapsedMs(null);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">TipCheck</h1>
        <p className="mt-1 opacity-80">
          Got a stock tip on Telegram, WhatsApp or Instagram? Paste it here for a 10-second reality check.
        </p>
      </header>

      {!card && (
        <section className="space-y-3">
          <label htmlFor="tip" className="sr-only">
            The tip
          </label>
          <textarea
            id="tip"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the tip here"
            rows={6}
            className="w-full rounded-xl border border-black/20 dark:border-white/25 bg-transparent p-3"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full border border-black/20 dark:border-white/25 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
              {image ? `Screenshot: ${image.name}` : "or upload a screenshot"}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            </label>
            {image && (
              <button onClick={clearImage} className="text-sm underline">
                Remove
              </button>
            )}
            <button
              onClick={check}
              disabled={loading}
              className="ml-auto rounded-full bg-foreground text-background px-5 py-2 font-semibold disabled:opacity-50"
            >
              {loading ? "Checking… (about 10 seconds)" : "Check this tip"}
            </button>
          </div>
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100 p-4 space-y-2">
          <p>{error}</p>
          <WhatWeRead text={errorReadText} />
        </div>
      )}

      {card && (
        <section className="space-y-3">
          <TipCard card={card} onPickCompany={pickCompany} picking={loading} />
          <div className="flex items-center justify-between">
            <button onClick={reset} className="rounded-full border border-black/20 dark:border-white/25 px-4 py-2 text-sm">
              Check another tip
            </button>
            {loading && <span className="text-sm opacity-70">Updating…</span>}
          </div>
        </section>
      )}

      {elapsedMs !== null && !loading && (
        <p className="text-xs opacity-50" data-testid="elapsed">
          Checked in {(elapsedMs / 1000).toFixed(1)} s
        </p>
      )}
    </main>
  );
}
