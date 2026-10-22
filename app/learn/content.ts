// Beginner lessons, quiz and myth cards. General education with clearly illustrative numbers,
// not advice and not predictions.

export const LESSONS = [
  {
    id: "share",
    title: "What a share really is",
    minutes: 1,
    body: [
      "A share is a tiny piece of ownership in a company. Own one share of a company with 100 crore shares and you own one part in 100 crore.",
      "The price moves because buyers and sellers change their minds about what the business will earn in the future. That's why prices can swing even when nothing seems to happen.",
      "A low price per share doesn't make a stock “cheap”. A ₹10 share can be expensive and a ₹3,000 share can be good value. What matters is the whole business.",
    ],
  },
  {
    id: "risk",
    title: "Risk and return go together",
    minutes: 1,
    body: [
      "Investments that might grow fast can also fall fast. That's the trade-off between risk and return.",
      "Volatility means how much a price swings. A stock that moves 50% a year can halve your money in months.",
      "Only invest money you won't need soon. Keep an emergency fund (often 3–6 months of expenses) in a safe place first.",
    ],
  },
  {
    id: "diversify",
    title: "Don't put all your eggs in one basket",
    minutes: 1,
    body: [
      "Diversification means spreading money across many companies and sectors, so one bad company doesn't sink you.",
      "Index funds are one common way to do this: one fund holds many companies, like everything in the Nifty 50.",
      "Owning 5 stocks from the same industry isn't real diversification. If that industry has a bad year, they can all fall together.",
    ],
  },
  {
    id: "compounding",
    title: "Compounding: returns on your returns",
    minutes: 1,
    body: [
      "If ₹1,000 grows 10% in a year, you have ₹1,100. If the next year also grows 10%, you earn on ₹1,100, not ₹1,000, and reach ₹1,210.",
      "Keep going for 10 years at 10% a year and ₹1,000 becomes about ₹2,594. (That's an illustration: real returns go up and down, and aren't guaranteed.)",
      "Compounding rewards time and patience. Starting early matters more than finding a “hot tip”.",
    ],
  },
  {
    id: "ratios",
    title: "Three ratios, in plain words",
    minutes: 2,
    body: [
      "P/E (price to earnings): how many rupees investors pay for each ₹1 of yearly profit. A P/E of 40 means paying ₹40 for ₹1 of profit. High isn't automatically bad, but it means a lot of growth is already expected.",
      "Debt to equity: how much the company has borrowed compared with what its owners have put in. Heavy debt makes bad years more dangerous.",
      "Profit margin: how much of each ₹100 of sales is left as profit. ₹5 out of ₹100 is a 5% margin.",
    ],
  },
  {
    id: "scams",
    title: "How to spot a tip scam",
    minutes: 1,
    body: [
      "Anyone paid to give stock advice in India must be registered with SEBI. Research analysts have numbers starting INH, investment advisers start INA. You can check them on sebi.gov.in.",
      "Registered advisers aren't allowed to promise guaranteed returns. “Sure shot”, “guaranteed 3x” and “95% accuracy” are red flags.",
      "Pressure (“only 10 slots left”), requests for your PAN, Aadhaar or OTP, and links to “recharge” on outside apps are classic signs of a scam.",
    ],
  },
];

export const QUIZ = [
  {
    q: "What do you own when you buy one share of a company?",
    options: ["A loan you gave the company", "A tiny piece of the company", "A promise of profit"],
    answer: 1,
    why: "A share is part-ownership. There's no promise of profit, and it isn't a loan (that would be a bond).",
  },
  {
    q: "A Telegram channel promises “guaranteed 40% returns in a month”. What is this?",
    options: ["Normal for good stocks", "A red flag", "Safe, if they seem confident"],
    answer: 1,
    why: "No one can guarantee market returns, and SEBI-registered advisers aren't allowed to promise them.",
  },
  {
    q: "What does diversification mean?",
    options: ["Buying more of the stock you like best", "Spreading money across many investments", "Trading every day"],
    answer: 1,
    why: "Spreading money out means one bad investment can't wipe you out.",
  },
  {
    q: "₹1,000 grows 10% a year for 2 years. What do you end up with?",
    options: ["₹1,200", "₹1,210", "₹1,100"],
    answer: 1,
    why: "Year 1: ₹1,100. Year 2 earns 10% on ₹1,100, giving ₹1,210. That extra ₹10 is compounding.",
  },
  {
    q: "A stock has high volatility. What does that tell you?",
    options: ["It will go up", "Its price swings a lot, up and down", "It's a safe stock"],
    answer: 1,
    why: "Volatility measures how much the price moves, in both directions. It says nothing about direction.",
  },
  {
    q: "Company A has a P/E of 50, Company B a P/E of 15. What does that mean?",
    options: ["A is a better company", "Investors pay more for each ₹1 of A's profit", "B will definitely rise"],
    answer: 1,
    why: "P/E is a price tag, not a quality score. A higher P/E means more growth is already expected and paid for.",
  },
  {
    q: "A share costs ₹5. Is it cheap?",
    options: ["Yes, ₹5 is very little", "Not necessarily, price alone tells you nothing", "Yes, it can only go up"],
    answer: 1,
    why: "What matters is the value of the whole business compared with the price, not the price of one share.",
  },
  {
    q: "How can you check if a tipster is allowed to give advice?",
    options: ["Count their Instagram followers", "Look up their SEBI registration number (INH/INA)", "Check if they post profit screenshots"],
    answer: 1,
    why: "SEBI publishes its register of research analysts and investment advisers. Followers and screenshots prove nothing.",
  },
];

export const MYTHS = [
  { myth: "Penny stocks are cheap, so they can't fall much.", fact: "A ₹2 stock can still fall to ₹0.20, a 90% loss. Tiny, thinly traded companies are also the favourite targets of pump-and-dump schemes." },
  { myth: "A stock that has fallen a lot must bounce back.", fact: "Some never recover. A big fall can mean the business got worse. “It was ₹500 last year” is not a reason it will return there." },
  { myth: "IPOs always give quick listing-day profits.", fact: "Some list below their issue price. Hype around an IPO doesn't guarantee anything." },
  { myth: "Last year's best stock will win again this year.", fact: "Past returns don't predict future ones. Yesterday's winners often disappoint." },
  { myth: "Trading more often means earning more.", fact: "Every trade has costs and taxes, and frequent trading often leads to emotional decisions. Many studies find most frequent traders do worse." },
  { myth: "If an adviser is SEBI-registered, their tips are safe.", fact: "Registration means they're accountable to SEBI, not that they're always right. Every investment can still lose money." },
];
