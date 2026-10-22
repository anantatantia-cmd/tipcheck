import type { Metadata } from "next";
import WatchlistView from "./WatchlistView";

export const metadata: Metadata = {
  title: "Watchlist & practice portfolio – TipCheck",
  description: "Save stocks to keep an eye on, and try “what if I had invested?” with pretend money.",
};

export default function WatchlistPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-serif text-5xl leading-tight">Watchlist & practice</h1>
      <p className="mt-2 max-w-2xl text-black/65">
        Keep an eye on stocks, and practise with pretend money before you ever use real money. Everything here is saved in
        this browser only. There&apos;s no account, and nothing is shared.
      </p>
      <div className="mt-8">
        <WatchlistView />
      </div>
    </main>
  );
}
