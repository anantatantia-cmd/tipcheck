import type { Metadata } from "next";
import { Suspense } from "react";
import CompareView from "./CompareView";

export const metadata: Metadata = {
  title: "Compare two stocks – TipCheck",
  description: "Put two NSE stocks side by side and see which looks steadier on each measure, explained simply.",
};

export default function ComparePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-serif text-5xl leading-tight">Compare two stocks</h1>
      <p className="mt-2 max-w-2xl text-black/65">
        Side by side, measure by measure. We point out which looks steadier on each one, but there&apos;s no overall “winner”:
        that depends on what you need.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl bg-black/[.04]" />}>
          <CompareView />
        </Suspense>
      </div>
    </main>
  );
}
