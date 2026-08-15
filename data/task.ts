export type TaskKind = "evaluation" | "golden_rewrite";
export type Domain = "traditional_finance" | "crypto";

export type ModuleField = { field: string; text: string };

export type ModuleInfo = {
  module: string;
  placement: string;
  publishedAt: string;
  screenshotSrc: string;
  screenshotAlt: string;
  fields: ModuleField[];
};

export type ModuleKey = "gold" | "energy" | "bnb";

export const MODULES: Record<ModuleKey, ModuleInfo> = {
  gold: {
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
        field: "Macro Analysis",
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
  },

  energy: {
    module: "Energy macro report (CLUSDT)",
    placement: "Market page, asset detail",
    publishedAt: "2026-08-12 20:26",
    screenshotSrc: "/clusdt-screenshot.png",
    screenshotAlt:
      "Energy CLUSDT module card showing price $82.83 (+1.20%), Core Conclusion, Macro Analysis, and Technical Analysis sections",
    fields: [
      {
        field: "Snapshot",
        text: "Displayed price: 82.83 (+1.20%). Last updated: 2026-08-12 20:26.",
      },
      {
        field: "Core Conclusion",
        text: "As of publication, CLUSDT trades at $82.73, +0.10% on the session, but remains -17.06% below the 100-session starting level. Latest volume is 4.36M, with turnover at $360.19M - lower than the recent expansion phase. Price is holding above $80.00, yet the rebound lacks confirmation above $84.00.\n\nCrypto sentiment remains subdued at 39, unchanged from last week. U.S. data are mixed: ADP employment was 44K versus 95K previously, while nonfarm payrolls fell by 23K; services activity held at 54.10, and prices rose to 70.30. Risk remains skewed to failed rebounds unless volume broadens.",
      },
      {
        field: "Macro Analysis",
        text: "CLUSDT - as of publication.\n\nHistory: CLUSDT rose from $68.30 to $92.27, then retraced to $80.31 before stabilizing at $82.73. The latest session gained +0.10%, but volume contracted to $360.19M, indicating weaker follow-through.\n\nExpectation: U.S. data had been positioned for softer labor momentum: payrolls at 85K, unemployment at 4.20%, CPI at 3.40%, and crude inventories falling by 1.70M barrels. The 10-year auction's prior yield was 458.00 bps.\n\nReality: Payrolls fell -23K, hourly earnings rose only 0.10%, and unemployment improved to 4.10%. Services remained expansionary at 54.10, while prices rose to 70.30. Crude inventories instead increased by 2.48M barrels. The combination is growth-negative for risk assets but not immediately disinflationary.\n\nOutlook: Upcoming CPI, PPI, retail sales, jobless claims, bond auctions, and inventories will determine whether rate sensitivity or supply-demand fundamentals dominate. Above $84.00, momentum may rebuild; failure to hold $80.00 keeps the structure vulnerable to renewed selling pressure.",
      },
      {
        field: "Technical Indicators",
        text: "MA(10/25/99): price is below MA25 $82.73 and MA99 $83.93; bearish structure; short MA $78.83 is rising.\n\nRSI(7): 60.60, above 50 but below 70; recovery momentum, not overbought.\n\nMACD: DIF -$0.05 below DEA approximately -$0.00; histogram -$0.05, negative but contracting.\n\nOBV: -19.75M, improving from -48.11M; accumulation recovery, volume confirmation incomplete.\n\nSupertrend: Bearish; resistance stop reference $88.08.",
      },
      {
        field: "Core Insight",
        text: "RSI and OBV support a tactical rebound. MACD remains negative, while price is below MA25/MA99 and Supertrend is bearish. Signals conflict; recovery momentum lacks trend confirmation.",
      },
      {
        field: "Bull/Bear Probability Assessment",
        text: "1-3 periods: bullish 55% / bearish 45% - RSI above 50 and OBV recovery favor rebounds; $83.93 is the first trend test.\n\n3-10 periods: bullish 40% / bearish 60% - MA25/MA99 overhead and bearish Supertrend cap upside unless price reclaims $88.08.",
      },
      {
        field: "Momentum Fades",
        text: "Price is $82.73, +0.10%, but remains -17.06% below the 100-session baseline. Volume contracted to 4.36M, with turnover of $360.19M. RSI(7) at 60.60 and improving OBV support a tactical rebound; negative MACD, overhead MA25/MA99, and bearish Supertrend limit confirmation.\n\nTrade plan: hold only above $80.00. A reclaim of $84.00 with expanding volume may target $88.08. Failure below $80.00 invalidates the rebound setup. Short-term bias is cautiously constructive; the 3-10-session structure remains bearish.",
      },
    ],
  },

  bnb: {
    module: "Crypto macro report (BNB)",
    placement: "Market page, asset detail",
    publishedAt: "2026-08-12 20:23",
    screenshotSrc: "/bnb-screenshot.png",
    screenshotAlt:
      "Crypto BNB module card showing price $614.99 (+0.35%), Core Conclusion, Macro Analysis, and Technical Analysis sections",
    fields: [
      {
        field: "Snapshot",
        text: "Displayed price: 614.99 (+0.35%). Last updated: 2026-08-12 20:23.",
      },
      {
        field: "Core Conclusion",
        text: "BNB closed at $615.07, up +5.70% over the 30-session sample, but eased -0.26% on the latest session. Turnover contracted to 67.70K BNB and $41.59M, versus $86.62M previously, indicating weaker confirmation near the $620.55 high.\n\nMomentum remains constructive above $600.00, while a close below that level would weaken the right-side setup. The crypto Fear & Greed Index is 39, consistent with restrained risk appetite.\n\nRecent U.S. data show payrolls at -23.00K versus 85.00K expected, unemployment at 4.10%, and ISM services prices at 70.30. Macro signals are mixed; no directional conclusion is assumed.",
      },
      {
        field: "Macro Analysis",
        text: "BNB latest close: $615.07, -0.26% daily; volume: 67.70K; turnover: $41.59M. After recovering from $551.07, price is consolidating below $620.55, while participation remains below the recent impulse peak. This is a right-side test, not a confirmed trend reversal.\n\nHistory: U.S. services activity stayed expansionary: S&P Global Services PMI at 54.60 versus 51.20 previously; ISM Services PMI at 54.10 versus 54.00. However, ISM prices rose to 70.30 from 67.70. Labor data weakened: ADP employment was 44K versus 95K, while payrolls printed -23K versus 20K; unemployment improved marginally to 4.10% from 4.20%.\n\nExpectation: Core CPI, CPI, PPI, retail sales, jobless claims, and Treasury auctions are due from 2026-08-13. CPI is forecast at 0.10% month-over-month and 3.40% year-over-year; core CPI at 0.20%. The prior 10-year auction yield was 458 bps and the 30-year auction yield was 505.80 bps.\n\nReality: Weak payrolls and softer wages reduce growth support, but elevated service prices preserve rate sensitivity. For BNB, liquidity conditions remain the dominant transmission channel. Holding $600.00 keeps the rebound structure intact; a break below it would expose $575.00. Sustained trade above $620.55 requires stronger volume and benign inflation data.",
      },
      {
        field: "Technical Analysis",
        text: "BNB Technical Report - 2026-08-12. Latest close: $615.07; daily change: -0.26%; volume: 67.70K BNB; turnover: $41.59M.",
      },
      {
        field: "Technical Indicators",
        text: "MA(10/25/99): $599.52 / $584.45 / [third MA value is truncated in the source screenshot].\n\nRSI(7): 76.52.\n\nMACD: DIF 8.89, DEA 5.74, histogram 3.15.\n\nOBV: -584.53K.\n\nSupertrend(10,3): Bullish; $576.35.",
      },
      {
        field: "Core Insight",
        text: "MA10 > MA25 and positive MACD confirm short-term upside momentum. Supertrend has turned bullish. RSI is overbought, while OBV has softened; this creates a momentum-versus-participation conflict. A break above $620.55 would improve confirmation; loss of $604.44 weakens the setup.",
      },
      {
        field: "Probability Assessment",
        text: "1-3 cycles: bullish 58%, bearish 42%.\n\n3-10 cycles: bullish 55%, bearish 45%. Bias remains constructive, but overbought RSI and sub-MA99 positioning cap conviction.",
      },
    ],
    // NOTE: the source screenshot for this module was cut off after
    // Probability Assessment (a scroll indicator was visible past this
    // point) — there may be an Additional Assessment / trade-plan section
    // like the other two modules have that isn't captured here. Add it to
    // the fields array above if/when the full table is available.
  },
};

// Which module serves which task, per domain. Traditional finance splits
// across two modules (Gold for Evaluation, Energy for Golden rewrite);
// crypto uses the one crypto module for both task types.
export const DOMAIN_TASK_MODULE: Record<Domain, Record<TaskKind, ModuleKey>> = {
  traditional_finance: { evaluation: "gold", golden_rewrite: "energy" },
  crypto: { evaluation: "bnb", golden_rewrite: "bnb" },
};

export const TASK_IDS: Record<Domain, Record<TaskKind, string>> = {
  traditional_finance: {
    evaluation: "xauusdt-eval-2026-08-12",
    golden_rewrite: "clusdt-golden-rewrite-2026-08-12",
  },
  crypto: {
    evaluation: "bnb-eval-2026-08-12",
    golden_rewrite: "bnb-golden-rewrite-2026-08-12",
  },
};

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
