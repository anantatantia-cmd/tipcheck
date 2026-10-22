# TipCheck

A 10-second reality check for stock tips. Paste a tip from Telegram, WhatsApp or Instagram, or upload a screenshot of it. TipCheck shows you what the tip is really claiming, which company it's about, whether the person behind it is SEBI-registered, and the red flags, each quoted word for word. It never tells you to buy or sell.

> Built for a hackathon MVP. Not investment advice.

## Job to be done

**When** a stock tip lands in my Telegram, WhatsApp or Instagram ("this smallcap will 3x by Diwali, join premium"), **I want to** see in seconds whether the source and the claim can be trusted, **so I can** decide calmly instead of losing money to a hyped or scam tip.

**User:** an 18–25 year old first-time investor in India (college student or first job), investing ₹1,000–10,000 at a time, who gets tips from finfluencers and groups.

Why it matters: SEBI's 2025 investor survey of 53,357 people found that 62% of investors make some decisions based on finfluencer recommendations ([SEBI, p. 62](https://www.sebi.gov.in/sebi_data/commondocs/jan-2026/Investor%20Survey%202025%20Main%20Report.pdf)). A CFA Institute study found only 3 of 48 Indian finfluencers were SEBI-registered ([CFA Institute](https://blogs.cfainstitute.org/marketintegrity/2026/08/24/indias-finfluencer-challenge-from-influence-to-accountability/)).

## The 3 tests the MVP must pass

1. **Scam tip → warning card in 15 seconds.** Paste *"This smallcap will 3x by Diwali 🚀 guaranteed. Only 50 slots in premium, DM @xyz_trades"*. Within 15 s the card shows the claim, at least 3 red flags with quotes (guaranteed return, urgency, paid group), the source as "couldn't verify", and **High** risk.
2. **Screenshot → correct company in 20 seconds.** Upload a screenshot of a tip that names a listed company. Within 20 s the card shows the matched NSE company (name and symbol), one line on what it does, and a "Not this company?" option. The card never gives buy, sell or hold advice.
3. **Bad input → friendly message, no crash.** An empty box, "hello how are you", a PDF, an image over 3 MB, a blank screenshot, or the AI being unreachable each give a clear, kind message, never a raw error.

**Status (22 Oct 2026):** test 3 passes in the browser. Tests 1 and 2 have not yet been run end to end: they need a valid Gemini API key in `.env.local`. Until then the app shows a "TipCheck isn't set up yet" message instead of a card.

## Current workflow → future workflow

| # | Today | With TipCheck |
|---|---|---|
| 1 | A tip arrives on Instagram, Telegram, WhatsApp or by SMS | Same |
| 2 | Decide in minutes. The median investor researches a stock for 6 minutes ([NYU/Investopedia](https://www.investopedia.com/investors-tend-to-be-impulse-buyers-11745450)) | Paste the tip or upload a screenshot (~10 s) |
| 3 | Ask Reddit or friends "is this legit?" and wait | **Gone** |
| 4 | Check SEBI registration and the company by hand (rarely done) | **Gone**: TipCheck does it |
| 5 | — | Confirm the company TipCheck matched (one tap) |
| 6 | — | Read the reality-check card (< 1 min) |
| 7 | Decide whether to act | Same: still the user's decision |

## Architecture: Input → AI → Logic → Action → Output

| Stage | What happens | AI or code | File |
|---|---|---|---|
| **Input** | Text box and/or screenshot. Empty or too short input, non-images and images over 3 MB are rejected here and never reach the AI. | Code | [`lib/validateInput.ts`](lib/validateInput.ts) |
| **AI: read** | Gemini reads the text or screenshot and returns fixed JSON: is it a tip, the full text it read, company names as written, the claim, the source, urgency phrases, and requests for money or ID. | AI | [`lib/ai.ts`](lib/ai.ts) `readTip` |
| **Logic** | Match the company to NSE's list of 2,611 listed companies, and get its size and industry from NSE's index lists. Look up the source in SEBI's register of 3,349 research analysts and investment advisers, by `INH`/`INA` registration number, or by name as a weaker match. Run the red-flag word rules. Add up risk points. | Code | [`lib/companies.ts`](lib/companies.ts), [`lib/sebi.ts`](lib/sebi.ts), [`lib/redFlags.ts`](lib/redFlags.ts), [`lib/risk.ts`](lib/risk.ts) |
| **Action: explain** | Gemini turns those facts, and only those facts, into plain-English sentences. Two safety checks follow: a word check, then a second Gemini call that reads the finished card for implied advice. If either flags it, the card is rewritten once, then replaced with fixed safe text. | AI + code check | [`lib/ai.ts`](lib/ai.ts) `writeCard` and `cardGivesAdvice`, [`lib/noAdvice.ts`](lib/noAdvice.ts) |
| **Output** | The card: risk badge and reason, the claim, the company (size and industry) with "Not this company?", who's behind it, red flags with exact quotes, and "What we read". | Code | [`components/TipCard.tsx`](components/TipCard.tsx), [`app/page.tsx`](app/page.tsx) |

Everything runs in one Next.js app. The browser posts to one server route, [`app/api/check/route.ts`](app/api/check/route.ts), which runs the steps in order. The API key only exists on the server.

### Risk score

The risk level comes from a fixed points recipe, so the same facts always give the same level:

| Fact | Points |
|---|---|
| Source not verified | +2 |
| Source's name matches a SEBI-registered adviser, but no registration number is shown | +1 |
| SEBI number quoted but not in the register | +3 |
| Each serious flag: guaranteed return, accuracy claim, PAN/Aadhaar/OTP request, outside or "recharge" site | +2 |
| No company named, or company not on NSE | +2 |
| Very small company (outside the Nifty 100, Midcap 150 and Smallcap 250 lists, i.e. the top 500) | +1 |
| Big-return promise, urgency, paid group | +1 each |

**High** = 4 or more points, **Medium** = 2–3, **Low signals found** = 0–1. The card never says "safe".

## Where AI is used, and what stays human

| Step | Who | Why |
|---|---|---|
| Read the tip (text or screenshot) | **AI** | Screenshots must be read as images, and tips are full of slang and Hinglish ("lock karo", "sure shot", "3x by Diwali"). A rule can't read a picture or reliably tell the company from the tipster. |
| Decide whether it's a tip at all | **AI** | "hello how are you" versus "Suzlon 52 → 80" is a judgement about meaning. |
| Write the plain-English lines | **AI** | Each tip has a different mix of facts, and templates can't explain why this flag matters. |
| Second safety check on the finished card | **AI** | A word list catches "you should buy", but not implied advice like "now could be the moment to get in". Judging that takes reading the meaning. |
| Company match, SEBI lookup, red flags, risk score, no-advice check | **Code** | These must be exact and repeatable. AI could invent a registration or a company. |
| Confirm or correct the company | **Human** | With "Not this company?". |
| Check a SEBI number on sebi.gov.in when asked | **Human** | |
| Decide whether to act on the tip | **Human** | TipCheck never says buy, sell or hold. Giving that advice also requires SEBI registration. |

## Why these tools

- **Gemini (`gemini-flash-lite-latest` first, `gemini-flash-latest` as backup)** reads screenshots and Hinglish, and returns JSON in a fixed shape (a JSON schema checked again with Zod), so the code never guesses at the format. It has a free tier. The lite model goes first because live logs showed the full Flash model often overloaded or rate-limited on the free tier. Each call has a 12 s timeout and one retry on overload. Set `GEMINI_MODEL` to pin a specific first choice.
- **Next.js** gives one app with the page and the server route together, and deploys to Vercel with no extra setup.
- **Vercel** hosts it for free, with the API key kept in its Environment Variables, never in code.
- **GitHub** holds the code, the prompts, the red-flag rules, the reference lists and the test cases.
- **Saved NSE and SEBI lists** (in [`data/`](data/)) instead of live lookups, to keep the MVP small. All are public lists, downloaded on 22 Oct 2026: NSE's listed companies, NSE's Nifty 100 / Midcap 150 / Smallcap 250 index lists (for company size and industry), and SEBI's register. The SEBI file keeps only names, registration numbers and type: no contact details.
- **n8n** was in the original design, but is left out of the MVP. One app means fewer moving parts before the deadline.

## Failure cases, and how the screen shows them

| What could go wrong | What the user sees |
|---|---|
| The AI misreads a screenshot | A **"What we read"** box shows the AI's transcription, so it can be checked against the screenshot. |
| Wrong company matched | The NSE name and symbol always show, and "Not this company?" lists alternatives. If nothing matches, the card says so and raises a red flag rather than guessing. |
| Company description out of date | It's labelled "AI summary – may be out of date". If the AI isn't sure, it says it couldn't confirm. |
| A tip uses a registered adviser's name but no number | Shown as "the name matches, but anyone can use a name", never as verified. The card asks the user to check the number on sebi.gov.in. |
| An unknown source | Shown as "couldn't verify", never "fraud". |
| Card wording drifts into advice | The word check and the second AI check both review the card. It's rewritten once, then replaced with fixed safe text. |
| Company size | Based on NSE's index lists, not live market value. A company that recently grew or shrank may be in the wrong group until the lists are refreshed. |
| Bad input | A plain message for each case (see test 3). |
| Missing or wrong API key | "TipCheck isn't set up yet…", checked before any call to Gemini. |
| Gemini busy or unreachable | "TipCheck is busy…" or "Something went wrong, please try again." The server log gets the error type only, never the key. |

**Known limits:** almost any tip without a SEBI registration number comes out Medium or High. The company description comes from Gemini's general knowledge, not a live source. The NSE and SEBI lists are snapshots.

**Out of scope for the MVP:** Telegram and WhatsApp bots, live market data, user accounts, a "report a scam" button.

## Run it locally

You need Node.js 20.9 or newer (24 LTS recommended) and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/anantatantia-cmd/tipcheck.git
cd tipcheck
npm install
cp .env.example .env.local
```

Open `.env.local` and put your key after `GEMINI_API_KEY=`, with no spaces or quotes. The file is ignored by git, so it is never committed.

```bash
npm run dev
```

Open http://localhost:3000 and paste the test 1 tip.

### Run the tests

With `npm run dev` running, in a second terminal:

```bash
npm run eval
```

This sends every case in [`evals/tips.json`](evals/tips.json) to the app and prints PASS or FAIL for each. That's 11 cases across the 3 tests, including 2 tip screenshots in [`evals/screenshots/`](evals/screenshots/). The example tips are written from patterns seen in Reddit research (paid Telegram groups, 90%+ accuracy claims, PAN/Aadhaar requests). They are not copied from real people.

### Deploy to Vercel

Import the repo in Vercel, then add `GEMINI_API_KEY` under **Settings → Environment Variables** before deploying.
