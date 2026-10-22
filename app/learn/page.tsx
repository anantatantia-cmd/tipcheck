import type { Metadata } from "next";
import LearnView from "./LearnView";

export const metadata: Metadata = {
  title: "Learn – TipCheck",
  description: "Bite-size investing lessons, a quick quiz and myth-busting cards for first-time investors.",
};

export default function LearnPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="font-serif text-5xl leading-tight">Learn in 5 minutes</h1>
      <p className="mt-2 max-w-2xl text-black/65">
        Short lessons, a quick quiz and myth-busting cards. No timers, no pressure: go at your own pace. Your progress is saved in
        this browser.
      </p>
      <div className="mt-8">
        <LearnView />
      </div>
    </main>
  );
}
