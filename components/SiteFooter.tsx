export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-black/5 bg-[#f7f7f5]">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-xs text-black/55">
        <p>
          <strong className="text-black/75">TipCheck is for learning, not investment advice.</strong> It is not a SEBI-registered
          adviser and never tells you to buy, sell or hold. Past price moves don&apos;t predict future ones. Check any adviser&apos;s
          registration yourself at sebi.gov.in.
        </p>
        <p>
          Data: NSE listed companies, index lists and end-of-day price files (not live); SEBI register of Research Analysts and
          Investment Advisers. Explanations are written by Google Gemini and can be wrong.
        </p>
      </div>
    </footer>
  );
}
