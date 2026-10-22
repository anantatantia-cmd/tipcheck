"use client";

import { useCallback, useSyncExternalStore } from "react";

// Watchlist, practice portfolio and learning progress are saved in this browser only
// (there are no accounts). Storage can be unavailable (private mode, blocked site data),
// so every read and write is wrapped and the pages still work without it.

const EVENT = "tipcheck-storage";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked or full: keep working for this visit only.
  }
  window.dispatchEvent(new Event(EVENT));
}

// Cache the parsed value per key so useSyncExternalStore gets a stable snapshot.
const cache = new Map<string, { raw: string | null; value: unknown }>();
function snapshot<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = raw ? read(key, fallback) : fallback;
  cache.set(key, { raw, value });
  return value;
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useStored<T>(key: string, fallback: T): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => snapshot(key, fallback),
    () => fallback,
  );
  const set = useCallback((next: T) => write(key, next), [key]);
  return [value, set];
}

// ----- Watchlist -----
const WATCH_KEY = "tipcheck.watchlist.v1";
const EMPTY: string[] = [];

export function useWatchlist() {
  const [list, setList] = useStored<string[]>(WATCH_KEY, EMPTY);
  const has = (symbol: string) => list.includes(symbol);
  const toggle = (symbol: string) => setList(has(symbol) ? list.filter((s) => s !== symbol) : [...list, symbol].slice(-25));
  return { list, has, toggle };
}

// ----- Practice portfolio (simulated only) -----
export type PracticeHolding = { id: string; symbol: string; name: string; amount: number; date: string; price: number };
const PORTFOLIO_KEY = "tipcheck.practice.v1";
const NO_HOLDINGS: PracticeHolding[] = [];

export function usePracticePortfolio() {
  const [holdings, setHoldings] = useStored<PracticeHolding[]>(PORTFOLIO_KEY, NO_HOLDINGS);
  return {
    holdings,
    add: (h: Omit<PracticeHolding, "id">) => setHoldings([...holdings, { ...h, id: `${Date.now()}-${h.symbol}` }].slice(-30)),
    remove: (id: string) => setHoldings(holdings.filter((h) => h.id !== id)),
  };
}
