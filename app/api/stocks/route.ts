import { getStockReport, searchStocks } from "@/lib/market";

// GET /api/stocks?q=tata          -> search by company name or NSE symbol
// GET /api/stocks?symbol=SUZLON    -> one stock's report
// GET /api/stocks?symbols=A,B,C    -> several reports (watchlist), at most 25
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const q = params.get("q");
  if (q !== null) return Response.json({ results: searchStocks(q.slice(0, 60)) });

  const symbol = params.get("symbol");
  if (symbol !== null) {
    const report = getStockReport(symbol.slice(0, 20));
    return report
      ? Response.json({ report })
      : Response.json({ error: "We couldn't find that stock on NSE's list." }, { status: 404 });
  }

  const symbols = params.get("symbols");
  if (symbols !== null) {
    const list = symbols.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25);
    return Response.json({ reports: list.map((s) => getStockReport(s.slice(0, 20))).filter(Boolean) });
  }

  return Response.json({ error: "Add ?q=, ?symbol= or ?symbols=" }, { status: 400 });
}
