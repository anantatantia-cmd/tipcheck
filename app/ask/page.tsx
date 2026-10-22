import type { Metadata } from "next";
import AskView from "./AskView";

export const metadata: Metadata = {
  title: "Ask anything – TipCheck",
  description: "Short, plain-English answers to beginner investing questions. No buy or sell advice.",
};

export default function AskPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-serif text-5xl leading-tight">Ask anything</h1>
      <p className="mt-2 text-black/65">
        Confused by a word or an idea? Ask in your own words. You&apos;ll get a short answer with an everyday example. It
        explains; it never tells you what to buy or sell.
      </p>
      <div className="mt-8">
        <AskView />
      </div>
    </main>
  );
}
