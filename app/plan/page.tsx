import type { Metadata } from "next";
import PlanView from "./PlanView";

export const metadata: Metadata = {
  title: "Where could my money go? – TipCheck",
  description:
    "Answer 7 quick questions and see how savings accounts, deposits, PPF, mutual funds, ETFs and stocks line up with your goal, time and comfort with risk. Real data, plain words, no advice.",
};

export default function PlanPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <p className="text-sm font-medium text-emerald-700">Research helper · beta</p>
      <h1 className="mt-1 font-serif text-5xl leading-tight">Where could my money go?</h1>
      <p className="mt-2 text-black/65">
        7 quick questions, then a side-by-side look at the usual options for first-time investors in India, with real numbers,
        the risks and why each one may or may not fit you.
      </p>
      <div className="mt-8">
        <PlanView />
      </div>
    </main>
  );
}
