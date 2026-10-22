"use client";

import { useState } from "react";
import { useStored } from "@/lib/storage";
import { LESSONS, MYTHS, QUIZ } from "./content";

const NO_LESSONS: string[] = [];

function Lessons() {
  const [done, setDone] = useStored<string[]>("tipcheck.lessons.v1", NO_LESSONS);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section aria-labelledby="lessons-h">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="lessons-h" className="text-2xl font-semibold">Lessons</h2>
        <p className="text-sm text-black/55">
          {done.length} of {LESSONS.length} read
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[.06]" role="progressbar" aria-valuemin={0} aria-valuemax={LESSONS.length} aria-valuenow={done.length} aria-label="Lessons read">
        <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(done.length / LESSONS.length) * 100}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {LESSONS.map((l) => {
          const isOpen = open === l.id;
          const isDone = done.includes(l.id);
          return (
            <li key={l.id} className="rounded-2xl ring-1 ring-black/10">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : l.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span className="font-medium">
                  <span aria-hidden>{isDone ? "✓ " : "○ "}</span>
                  <span className="sr-only">{isDone ? "Read: " : "Not read yet: "}</span>
                  {l.title}
                </span>
                <span className="shrink-0 text-xs text-black/50">{l.minutes} min</span>
              </button>
              {isOpen && (
                <div className="space-y-3 px-4 pb-4 text-black/80">
                  {l.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {!isDone && (
                    <button
                      type="button"
                      onClick={() => {
                        setDone([...done, l.id]);
                        setOpen(null);
                      }}
                      className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                    >
                      Got it ✓
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Quiz() {
  const [best, setBest] = useStored<number>("tipcheck.quizbest.v1", 0);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const finished = i >= QUIZ.length;
  const q = QUIZ[i];

  if (finished) {
    return (
      <div className="rounded-2xl bg-[#f7f7f5] p-6 text-center">
        <p className="text-sm text-black/55">You got</p>
        <p className="mt-1 font-serif text-5xl">
          {score} / {QUIZ.length}
        </p>
        <p className="mt-2 text-black/65">
          {score === QUIZ.length ? "Perfect. You'd spot most hype tips." : "Read the explanations and try again any time."}
        </p>
        <p className="mt-1 text-sm text-black/50">Your best: {Math.max(best, score)} / {QUIZ.length}</p>
        <button
          type="button"
          onClick={() => {
            setI(0);
            setPicked(null);
            setScore(0);
          }}
          className="mt-4 rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 ring-1 ring-black/10">
      <p className="text-sm text-black/55">
        Question {i + 1} of {QUIZ.length}
      </p>
      <p className="mt-2 text-lg font-medium">{q.q}</p>
      <ul className="mt-4 space-y-2">
        {q.options.map((o, idx) => {
          const isRight = idx === q.answer;
          const show = picked !== null;
          const cls = !show
            ? "ring-black/15 hover:bg-black/5"
            : isRight
              ? "bg-emerald-50 ring-emerald-300"
              : idx === picked
                ? "bg-red-50 ring-red-300"
                : "ring-black/10 opacity-60";
          return (
            <li key={o}>
              <button
                type="button"
                disabled={show}
                onClick={() => {
                  setPicked(idx);
                  if (isRight) setScore((s) => s + 1);
                }}
                className={`w-full rounded-xl px-4 py-3 text-left ring-1 ${cls}`}
              >
                {show && isRight && <span aria-hidden>✓ </span>}
                {show && !isRight && idx === picked && <span aria-hidden>✗ </span>}
                {show && isRight && <span className="sr-only">Correct answer: </span>}
                {show && !isRight && idx === picked && <span className="sr-only">Your answer, incorrect: </span>}
                {o}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <div className="mt-4" aria-live="polite">
          <p className="rounded-xl bg-[#f7f7f5] p-3 text-sm">
            <strong>{picked === q.answer ? "Right." : "Not quite."}</strong> {q.why}
          </p>
          <button
            type="button"
            onClick={() => {
              const next = i + 1;
              if (next >= QUIZ.length) setBest(Math.max(best, score));
              setI(next);
              setPicked(null);
            }}
            className="mt-3 rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
          >
            {i + 1 < QUIZ.length ? "Next question" : "See my score"}
          </button>
        </div>
      )}
    </div>
  );
}

function Myths() {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const m = MYTHS[i];
  const go = (d: number) => {
    setI((i + d + MYTHS.length) % MYTHS.length);
    setRevealed(false);
  };
  return (
    <div className="rounded-2xl bg-black p-6 text-white">
      <p className="text-xs uppercase tracking-wide text-white/50">
        Myth {i + 1} of {MYTHS.length}
      </p>
      <p className="mt-3 font-serif text-2xl leading-snug">“{m.myth}”</p>
      <div aria-live="polite">
        {revealed ? (
          <p className="mt-4 rounded-xl bg-white/10 p-4 text-white/90">
            <strong className="text-emerald-300">Reality: </strong>
            {m.fact}
          </p>
        ) : (
          <button type="button" onClick={() => setRevealed(true)} className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-medium text-black">
            Bust this myth
          </button>
        )}
      </div>
      <div className="mt-6 flex justify-between">
        <button type="button" onClick={() => go(-1)} className="rounded-full px-4 py-2 text-sm ring-1 ring-white/30" aria-label="Previous myth">
          ← Previous
        </button>
        <button type="button" onClick={() => go(1)} className="rounded-full px-4 py-2 text-sm ring-1 ring-white/30" aria-label="Next myth">
          Next →
        </button>
      </div>
    </div>
  );
}

export default function LearnView() {
  return (
    <div className="space-y-12">
      <Lessons />
      <section aria-labelledby="quiz-h">
        <h2 id="quiz-h" className="text-2xl font-semibold">Quick quiz</h2>
        <div className="mt-3">
          <Quiz />
        </div>
      </section>
      <section aria-labelledby="myth-h">
        <h2 id="myth-h" className="text-2xl font-semibold">Myth or reality?</h2>
        <div className="mt-3">
          <Myths />
        </div>
      </section>
    </div>
  );
}
