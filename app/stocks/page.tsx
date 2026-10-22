import type { Metadata } from "next";
import { Suspense } from "react";
import StocksView from "./StocksView";

export const metadata: Metadata = {
  title: "Stock risk check – TipCheck",
  description: "Search any NSE stock and see how much it swings, how far it fell and how actively it trades, explained simply.",
};

export default function StocksPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-serif text-5xl leading-tight">Stock risk check</h1>
      <p className="mt-2 max-w-2xl text-black/65">
        Search any company listed on NSE. See what its past year of prices says about risk, with every number explained.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl bg-black/[.04]" />}>
          <StocksView />
        </Suspense>
      </div>
    </main>
  );
}
