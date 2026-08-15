export type TaskKind = "evaluation" | "golden_rewrite";

// Shared across both task types — same stimulus, different work on top of it.
export const MODULE_INFO = {
  module: "Gold macro report (XAUUSDT)",
  placement: "Market page, asset detail",
  publishedAt: "2026-08-12 20:23",
  screenshotSrc: "/xauusdt-screenshot.png",
  screenshotAlt:
    "Gold XAUUSDT module card showing price $4,428.53 (+0.70%), Core Conclusion, Macro Analysis, and Technical Analysis sections",

  fields: [
    {
      field: "Snapshot",
      text: "Displayed price: 4,428.53 (+0.70%). Last updated: 2026-08-12 20:23.",
    },
    {
      field: "Core Conclusion",
      text: "XAUUSDT is recovering, not breaking out. As of publication, price is $4,412.80, up +0.84% on the latest session, with turnover at $721.77M and volume at 163.78K. The rebound from $3,990.93 is approximately +10.58%, but price remains below the recent $4,439.54 high.\n\nMacro signals are mixed: U.S. Nonfarm Payrolls printed -23.00K versus 85.00K forecast and 20.00K previous; unemployment was 4.10% versus 4.20% forecast; Services PMI improved to 54.60 from 51.20, while ISM prices rose to 70.30 from 67.70. Fear and Greed stands at 39, unchanged week-on-week and up +2 month-on-month. The right-side trigger is a sustained break above $4,439.54; failure risks a retracement toward $4,300.",
    },
    {
      field: "Macro Analysis (translated from Chinese)",
      text: "History: Recent U.S. employment data weakened versus expectations. ADP employment was 44K, below the 68K expectation and 95K previous reading; nonfarm payrolls were -23K, far below the 85K expectation and 20K previous reading; unemployment was 4.10%, below the 4.20% expectation; average hourly earnings rose only 0.10%, below the 0.30% expectation. Services remained resilient: ISM Services PMI was 54.10, but the prices index climbed to 70.30, showing persistent services-inflation pressure.\n\nExpectation: Markets are focused on CPI on 2026-08-12, PPI and retail sales on 2026-08-13, the 10-year Treasury auction on 2026-08-12, and the 30-year Treasury auction on 2026-08-13. CPI is expected at +0.10% month-over-month and 3.40% year-over-year; core CPI at +0.20% month-over-month; PPI at +0.20% month-over-month. The prior auction yield shown in the source is 458.00 bps.\n\nReality: XAUUSDT is shown at $4,412.80, up about +0.83% from the prior close, with volume of 163.78K and turnover of $721.77M. Price has rebounded from $4,078.23, but remains below the previous high. Weak U.S. labor data and softer wage growth raise rate-cut expectations, which is supportive for gold; persistently high services inflation keeps real-rate pressure elevated and limits upside.",
    },
    {
      field: "Technical Indicators",
      text: "MA(10/25/99): $4,292.48 > $4,157.84; price $4,412.80 > MA99 $4,279.15. Bullish alignment.\n\nRSI(7): 75.34; overbought; momentum remains positive but crowded.\n\nMACD: DIF 80.87 > DEA 48.71; histogram 32.15, down from 36.95. Bullish, momentum easing.\n\nOBV: -133.43K; below the prior +150.84K peak. Volume confirmation is mixed.\n\nSupertrend(10,3): Bullish; trail at $4,178.15.",
    },
    {
      field: "Core Insight",
      text: "MA, MACD and Supertrend confirm an advancing trend. RSI is overbought, while MACD energy is fading and OBV does not confirm a new high; near-term pullback risk is rising.",
    },
    {
      field: "Probability Assessment",
      text: "1-3 periods: bullish 58%, bearish 42%.\n\n3-10 periods: bullish 64%, bearish 36%.\n\nTrend bias stays positive above $4,279.15; a break below $4,178.15 weakens the setup.",
    },
    {
      field: "Additional Assessment",
      text: "XAUUSDT - 2026-08-12. Price is $4,412.80, up +0.83%, with turnover of $721.77M and volume of 163.78K. The rebound from $4,078.23 is approximately +8.21%, but price remains below $4,439.54.\n\nTechnical structure remains constructive: price is above MA99 at $4,279.15, MACD is positive, and Supertrend support sits at $4,178.15. RSI at 75.34 signals an extended market; the MACD histogram has eased to 32.15 from 36.95, while OBV provides weak confirmation.\n\nMacro signals are mixed. Nonfarm payrolls were -23.00K versus 85.00K expected; unemployment 4.10% versus 4.20% expected. ISM prices rose to 70.30 from 67.70, preserving inflation risk. CPI is due on 2026-08-12, followed by PPI and retail sales on 2026-08-13.\n\nTrade plan: maintain a bullish bias above $4,279.15. Add only on a sustained break above $4,439.54. Failure to hold the trailing level risks a pullback toward $4,300.00; below $4,178.15 the setup weakens materially.",
    },
  ],
};

export const EVAL_TASK_ID = "xauusdt-eval-2026-08-12";
export const GOLDEN_REWRITE_TASK_ID = "xauusdt-golden-rewrite-2026-08-12";

export type PersonaKey = "rookie" | "mid_tier" | "experienced";

export const PERSONAS: { key: PersonaKey; label: string; definition: string }[] = [
  {
    key: "rookie",
    label: "Rookie",
    definition:
      "Little to no prior investment experience. May have downloaded the app due to word-of-mouth rather than a specific strategy. Awareness is typically limited to major assets like BTC or BNB. Extremely low risk appetite.",
  },
  {
    key: "mid_tier",
    label: "Mid-tier",
    definition:
      "Has invested in US stocks or ETFs and tracks indices. Lacks a formal personal trading strategy and often relies on following external calls or recommendations. Generally avoids high-risk derivatives, futures, or volatile assets.",
  },
  {
    key: "experienced",
    label: "Experienced",
    definition:
      "Mature users comfortable with futures, derivatives, and high-volatility assets. Requires information density, specific trading levels, and scenarios.",
  },
];

// Offered as starting points for each answer section's heading — attempters
// can use these, write their own, or mix both. There's no fixed count;
// use as many as the asset and persona genuinely call for.
export const SUGGESTED_HEADINGS = [
  "Core Conclusion",
  "Macro Analysis",
  "Technical Analysis",
  "Core Insight",
];

// Shown above each persona's reasoning checklist in the golden rewrite form —
// modeled as a step-by-step chain of thought (observation, then conclusion),
// not just a flat list of topics to cover.
export type ChecklistExampleStep = {
  step: string;
  observations: string;
  conclusion: string;
};

export const CHECKLIST_EXAMPLE: ChecklistExampleStep[] = [
  {
    step: "Evaluate price and volume movements since the last session.",
    observations:
      "Price moved +3.2% while volume increased by 15% relative to the 20-day average.",
    conclusion:
      "Strong buying demand confirmed by above-average volume — a firmer signal than a low-volume drift, though volume alone doesn't tell us whether the buying is coming from institutions or retail traders.",
  },
  {
    step: "Map price against moving averages and support/resistance zones.",
    observations:
      "Price sits at $64,200, positioned above both the 50-day EMA ($61,500) and 200-day EMA ($58,000). Immediate resistance is at $65,500, with support at $63,000.",
    conclusion:
      "The broader medium-term structure remains bullish as long as price holds above the 50-day EMA.",
  },
  {
    step: "Analyze technical momentum indicators for convergence or divergence.",
    observations:
      "RSI(14) is at 62; MACD line is above the signal line with expanding positive histogram bars.",
    conclusion:
      "Momentum indicators agree on an upward bias. No overbought warnings or bearish divergences detected yet.",
  },
  {
    step: "Identify macro catalysts and transmission channels.",
    observations:
      "Upcoming FOMC rate decision in 3 days; CPI print scheduled for next week.",
    conclusion:
      "Macro volatility is expected within a 72-hour window. Short-term derivative/leverage positions carry elevated risk ahead of the release.",
  },
  {
    step: "Adapt synthesis and action levels to the target persona.",
    observations:
      "Persona context: Mid-tier (seeking clear direction and risk boundaries without excessive technical jargon).",
    conclusion:
      "Highlight the $65.5k resistance target clearly and define $63.0k as the key level that invalidates the short-term bullish outlook.",
  },
];
