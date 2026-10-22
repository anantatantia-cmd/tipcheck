"use client";

import { useRef, useState } from "react";
import TipCard, { WhatWeRead } from "@/components/TipCard";
import type { Card, CheckResponse, CompanyMatch } from "@/lib/types";
import { MAX_IMAGE_BYTES, TOO_BIG_MESSAGE } from "@/lib/validateInput";

const EXAMPLE_TIP = "This smallcap will 3x by Diwali 🚀 guaranteed. Only 50 slots in premium, DM @xyz_trades";

// The tip checker: paste or upload, then show the reality-check card.
export default function Checker() {
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
      // The host rejects oversized uploads with a plain-text 413 before our route runs.
      if (res.status === 413) throw new Error(TOO_BIG_MESSAGE);
      const data = (await res.json()) as CheckResponse;
      if (data.ok) {
        setCard(data.card);
        setExtraction(data.extraction);
      } else {
        setCard(null);
        setError(data.error);
        setErrorReadText(data.readText ?? "");
      }
    } catch (err) {
      setCard(null);
      setError(err instanceof Error && err.message === TOO_BIG_MESSAGE ? TOO_BIG_MESSAGE : "Something went wrong, please try again.");
    } finally {
      setElapsedMs(Date.now() - started);
      setLoading(false);
    }
  }

  function check() {
    // Catch big screenshots here, before uploading anything.
    if (image && image.size > MAX_IMAGE_BYTES) {
      setError(TOO_BIG_MESSAGE);
      return;
    }
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

  if (card) {
    return (
      <div className="space-y-3">
        <TipCard card={card} onPickCompany={pickCompany} picking={loading} />
        <div className="flex items-center justify-between gap-3">
          <button onClick={reset} className="rounded-full border border-black/15 px-5 py-2 text-sm font-medium hover:bg-black/5">
            Check another tip
          </button>
          <span className="text-xs text-black/50">
            {loading ? "Updating…" : elapsedMs !== null ? `Checked in ${(elapsedMs / 1000).toFixed(1)} s` : ""}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label htmlFor="tip" className="sr-only">
        The tip
      </label>
      <textarea
        id="tip"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        placeholder="Paste the tip here, e.g. “XYZ will 3x by Diwali, join premium…”"
        rows={5}
        className="w-full resize-none rounded-2xl border border-black/15 bg-white p-4 text-[15px] outline-none focus:border-black/40"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/5">
          {image ? `📎 ${image.name}` : "📷 Upload a screenshot"}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              setImage(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
        </label>
        {image ? (
          <button onClick={clearImage} className="text-sm underline text-black/60">
            Remove
          </button>
        ) : (
          <button onClick={() => setText(EXAMPLE_TIP)} className="text-sm underline text-black/60">
            Try an example
          </button>
        )}
        <button
          onClick={check}
          disabled={loading}
          className="ml-auto rounded-full bg-black px-6 py-2.5 font-medium text-white hover:bg-black/85 disabled:opacity-50"
        >
          {loading ? "Checking…" : "Check this tip →"}
        </button>
      </div>
      {loading && <p className="text-sm text-black/50">Reading the tip and checking SEBI and NSE records… (about 10 seconds)</p>}
      {error && (
        <div role="alert" className="space-y-2 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
          <p>{error}</p>
          <WhatWeRead text={errorReadText} />
        </div>
      )}
    </div>
  );
}
