export type TaskKey = "sol" | "btc" | "nasdaq" | "mu" | "ibit" | "xrp" | "sp500";
export type PortraitKey = "G1" | "G2" | "G3";

export type ReportSection = { heading: string; body: string };

export type ReportTask = {
  taskId: string;
  label: string; // shown in the picker
  title: string;
  ticker: string;
  category: string;
  generatedAt: string;
  sections: ReportSection[];
  // Which portrait(s) Part B requires a rewrite for. One entry = the
  // existing single-rewrite flow (SOL, BTC, Nasdaq). Two entries = Part B
  // requires a separate rewrite for each, back to back, inside the same
  // task - Part A is still answered only once either way.
  assignedPortraits: PortraitKey[];
  // If set, only these emails (case-insensitive) can select this report -
  // used to restrict specific reports to specific named experts. Undefined
  // means open to anyone, same as SOL/Nasdaq. This is a UI convenience
  // (hides the option from the picker unless the typed email matches),
  // not a real access-control boundary - same trust model as the rest of
  // this app, where name/email are just typed text with no verification
  // anywhere. Someone who knew the exact allowed email could still type it
  // in and get access; there's no auth layer to stop that.
  allowedEmails?: string[];
  // A fabricated, precise micro-fact that never appears anywhere in the
  // visible report. Rendered as genuine in-flow text - color-matched to
  // the report panel's white background and set to a near-zero font size
  // - so it survives a normal copy-paste selection (manual drag, Ctrl+A,
  // or a script reading the DOM), unlike an off-screen/clipped element,
  // which a mouse selection never sweeps over.
  //
  // The register depends on which portrait(s) actually need to carry it:
  // - G1-only reports (BTC, Nasdaq): plain, non-jargon "worth watching if
  //   price slips toward $X" language, since G1 rewrites should never use
  //   trading jargon like "support level" or options terminology - a
  //   canary phrased that way would be one a compliant G1 rewrite
  //   correctly omits regardless of whether the page was read
  //   programmatically.
  // - G3-only (SOL) and dual-portrait reports (MU, IBIT, XRP, S&P 500):
  //   an options put/call ratio stat instead. These reports already
  //   anchor on one or two specific price levels apiece, so a canary that
  //   was "just another level" was liable to get silently merged into the
  //   report's own already-established number by any reasonably good
  //   rewrite (a sensible writer consolidates two mentions of the same
  //   idea into the cleaner, pre-existing figure rather than keeping
  //   both). A put/call ratio has nothing else in the report to be merged
  //   into, and fits G3's own script ("I hedge with options") as
  //   something that reads as information worth keeping. The tradeoff:
  //   it's advanced options jargon, so a compliant G1 rewrite should
  //   never include it - for the four dual-portrait reports, this canary
  //   only meaningfully covers their G3 half, not their G1 half.
  //
  // Whichever form is used, a human working only from the visible page has
  // no way to reproduce this exact figure by accident; if it turns up in
  // a submission, that's strong evidence the report's actual page content
  // made it into whatever pipeline produced the rewrite.
  canary: string;
};

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type RewriteSection = { heading: string; bullets: string };

export function emptyRewriteSection(): RewriteSection {
  return { heading: "", bullets: "" };
}

// Flattens the structured title/bullets sections into one markdown string
// for storage — this is what actually lands in the database (rewrite_text),
// not the structured array itself.
export function sectionsToMarkdown(sections: RewriteSection[]): string {
  return sections
    .map((s) => {
      const bulletLines = s.bullets
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => `- ${b}`)
        .join("\n");
      return `## ${s.heading.trim()}\n${bulletLines}`;
    })
    .join("\n\n");
}

// Word count for the ±20% bound is based on the actual written content
// (titles + bullets), not the markdown punctuation ("##", "-") added when
// flattening — that punctuation would otherwise inflate the count.
export function sectionsWordCount(sections: RewriteSection[]): number {
  return wordCount(sections.map((s) => `${s.heading} ${s.bullets}`).join(" "));
}

export function reportWordCount(task: ReportTask): number {
  return wordCount(task.sections.map((s) => `${s.heading} ${s.body}`).join(" "));
}

// Reports open to anyone. Restricted reports (allowedEmails set) are never
// listed here - they're surfaced dynamically per email by
// visibleTasksForEmail below.
export const TASK_ORDER: TaskKey[] = ["sol", "nasdaq"];

// The full picker list for a given (in-progress) email: every open report,
// plus any restricted report whose allowedEmails includes this exact email
// (case-insensitive, trimmed). Recomputed live as the gate screen's email
// field changes.
export function visibleTasksForEmail(email: string): TaskKey[] {
  const normalized = email.trim().toLowerCase();
  const restricted = (Object.keys(REPORTS) as TaskKey[]).filter((key) => {
    const allowed = REPORTS[key].allowedEmails;
    return (
      allowed &&
      normalized.length > 0 &&
      allowed.some((e) => e.toLowerCase() === normalized)
    );
  });
  return [...TASK_ORDER, ...restricted];
}

export const REPORTS: Record<TaskKey, ReportTask> = {
  sol: {
    taskId: "sol-market-report-2026-08-18",
    label: "SOL Market Report",
    title: "SOL Market Report",
    ticker: "SOLUSDT",
    category: "Crypto",
    generatedAt: "2026-08-18 18:13:23 (UTC+8)",
    assignedPortraits: ["G3"],
    canary: "options put/call ratio near 0.62, lowest in three weeks",
    sections: [
      {
        heading: "Core Conclusion",
        body: "SOL remains in a constructive consolidation at $75.90. Price is holding above key short- and medium-term moving averages, while institutional inflows, whale accumulation, and improving network fundamentals continue to support the broader setup.\n\nHowever, conviction remains limited: SOL is still in the lower third of its six-month range and trading volume has contracted to just 0.48x its 30-day average.\n\nNear-term bias: cautiously bullish while $73 holds. A sustained break above $80, ideally accompanied by stronger volume, would provide clearer confirmation of another upside leg.\n\n[SOL spot · SOLUSDT Trade entry card]",
      },
      {
        heading: "Market Overview",
        body: "SOL closed at $75.90, down 0.16% from the prior session, after trading in a narrow $75.20–$76.27 range.\n\nThe muted daily move points to consolidation rather than a decisive shift in trend. Short-term performance remains slightly soft, while the one-month structure is still constructive.\n\nDaily Change: -0.16% (Momentum remains muted)\nPrice Change: -$0.12 (Limited selling pressure)\n1-Week Performance: -0.50% (Short-term consolidation)\n1-Month Performance: +3.01% (Broader bias remains constructive)",
      },
      {
        heading: "What Is Driving SOL",
        body: "1. Institutional demand remains the primary support\nETF inflows provide a more durable source of demand than short-term speculative flows. Continued institutional participation would strengthen the bullish case by improving the consistency of marginal buying.\n\n2. Whale accumulation reinforces positioning\nRecent large-holder accumulation suggests stronger conviction among concentrated investors. This supports sentiment in the near term, although it also makes the market more sensitive to any reversal in whale positioning.\n\n3. Network development strengthens the medium-term thesis\nOngoing network upgrades and expanded real-world payment infrastructure improve Solana's utility and execution capacity.\n\nProposed fee reforms could further strengthen SOL's token economics through increased burn, although their market impact will depend on implementation and actual network activity.\n\nKey Risk\nRegulatory uncertainty and uneven market participation remain the main constraints. Fundamental improvements alone may not be sufficient to drive a sustained breakout without stronger liquidity and broader risk appetite.",
      },
      {
        heading: "Technical Setup",
        body: "Trend: SOL is trading above both its 7-day MA at $75.60 and 10-day MA at $75.78. The 7-day MA also remains above the 25-day MA at $74.70, leaving the short-term trend constructive.\n\nRange: The six-month range is $60.13–$118.85. At $75.90, SOL sits in roughly the lower third of that range, showing that the recent recovery has not yet developed into a broader breakout.\n\nParticipation: Latest daily volume was 579.70K SOL, only 0.48x the previous 30-day average of 1.22M SOL.\n\nTechnical Read\nThe setup is constructive but not yet confirmed. Price is holding above key trend references, but weak participation and lower-range positioning suggest the current move is still better characterized as consolidation than a fully established bullish expansion.",
      },
      {
        heading: "What Changes the View",
        body: "Bullish confirmation: A sustained break above $80, particularly on materially stronger volume, would strengthen the case for renewed upside momentum.\n\nBearish invalidation: A loss of $73 would weaken the current structure and suggest the recent consolidation is resolving lower.",
      },
      {
        heading: "Relevant Catalysts",
        body: "Institutional demand (ETF inflows): Continued ETF participation would reinforce the report's primary bullish driver by providing more persistent marginal demand.\n\nWhale positioning ($3.60M SOL purchase): A Solana whale returned after two years with a sizeable SOL purchase, supporting the view that larger holders are selectively accumulating.\n\nNetwork adoption (MoneyGram expansion): MoneyGram expanded its Solana-based Ramps service to support app-based cash deposits in more than 25 markets and withdrawals across more than 170 markets, strengthening the network-utility narrative.",
      },
      {
        heading: "Bottom Line",
        body: "SOL's structure is improving, but the market has not yet produced enough volume or range expansion to confirm a decisive bullish breakout. $73 protects the current setup; $80 is the key confirmation level.",
      },
    ],
  },

  btc: {
    taskId: "btc-market-report-2026-08-18",
    label: "BTC Market Report",
    title: "BTC Market Report",
    ticker: "BTCUSDT",
    category: "Crypto",
    generatedAt: "2026-08-18 18:20:24 (UTC+8)",
    assignedPortraits: ["G1"],
    canary: "worth watching if price slips toward $61,940.15",
    sections: [
      {
        heading: "Core Conclusion",
        body: "BTC is caught between improving crypto-specific demand and restrictive macro liquidity.\n\nThe asset closed at $64,163.06, down 0.57%, while ETF demand and a softer U.S. dollar continue to provide fundamental support.\n\nHowever, elevated Treasury yields, weak trading volume, and an incomplete technical recovery are preventing that demand from translating into a convincing breakout.\n\nNear-term bias: neutral-to-bearish below $65,000. The current rebound lacks participation, so a sustained move above $65,000 on stronger volume is needed before the setup turns convincingly bullish.\n\n[BTC spot · BTCUSDT Trade entry card]",
      },
      {
        heading: "Market Overview",
        body: "BTC closed at $64,163.06, down 0.57%, after trading between $64,047.73 and $64,568.46.\n\nThe narrow session range and modest decline point to consolidation rather than aggressive selling.\n\nBTC remains up 1.77% over five days, but only 0.28% over 20 days, showing that the recent rebound has yet to develop into a clear medium-term trend.\n\nDaily Change: -0.57% (Mild selling pressure)\nPrice Change: -$369.04 (Weak close)\n5-Day Performance: +1.77% (Recent rebound intact)\n20-Day Performance: +0.28% (Broader trend remains mixed)",
      },
      {
        heading: "What Is Driving BTC",
        body: "1. ETF demand is the strongest crypto-specific support\nInstitutional ETF flows provide a persistent source of marginal demand and can help BTC absorb available supply. This remains the clearest positive structural driver, particularly if institutional exposure continues expanding.\n\n2. A softer dollar improves the liquidity backdrop\nDollar weakness reduces currency headwinds for global investors and generally improves financial conditions for risk assets. For BTC, this complements ETF demand by creating a more supportive external liquidity environment.\n\n3. High Treasury yields remain the main macro constraint\nElevated yields increase the opportunity cost of holding non-yielding assets and tighten overall financial conditions. This creates the central tension in the current BTC setup: crypto-specific demand is improving, but macro liquidity remains restrictive.\n\n4. Weak market participation limits conviction\nCurrent trading volume is substantially below recent norms. That matters because low-volume rallies are more vulnerable to reversal: relatively small order flows can move price, but those moves provide weaker evidence of broad market conviction.\n\nKey Risk\nRegulatory progress could further strengthen institutional participation, but security incidents, reduced corporate accumulation, or renewed macro tightening could offset that support.",
      },
      {
        heading: "Technical Setup",
        body: "Trend: BTC is above both its 7-day MA at $63,527.94 and 25-day MA at $63,935.07, showing that price has recovered above important short- and medium-term reference levels.\n\nHowever, the 7-day MA remains below the 25-day MA. That means price has improved faster than the underlying moving-average structure: the rebound is visible, but the trend itself has not yet fully turned bullish.\n\nRange: BTC's six-month range is $57,800.19–$82,850.00. At $64,163.06, BTC remains in the lower portion of that range, leaving the broader structure relatively subdued.\n\nParticipation: Latest daily volume was 5.63K BTC, versus a 30-day average of 13.96K BTC, or just 0.40x normal volume.\n\nTechnical Read\nThe current move looks more like a low-conviction recovery than a confirmed trend reversal. Price has reclaimed both moving averages, which is constructive, but the moving-average structure, range position, and weak participation all argue against treating the rebound as a clean bullish breakout.",
      },
      {
        heading: "What Changes the View",
        body: "Bullish confirmation: A sustained break above $65,000, accompanied by a meaningful increase in volume, would strengthen the case that the recovery is becoming a genuine trend move.\n\nBearish continuation: Failure to hold the current moving-average cluster would weaken the recovery and increase the risk of another move toward the lower end of the recent range.",
      },
      {
        heading: "Relevant Catalysts",
        body: "Institutional demand (Jane Street ETF exposure): Reported Bitcoin ETF holdings of more than $1.00B reinforce the thesis that institutional participation remains an important source of structural demand.\n\nLiquidity risk (low-volume rally): Recent BTC gains have occurred alongside weak participation, consistent with the report's view that the current recovery lacks strong confirmation.\n\nBreakout catalyst (range consolidation): BTC remains in a consolidation phase, making a confirmed break of the current range more informative than small moves within it.",
      },
      {
        heading: "Bottom Line",
        body: "BTC has regained important technical levels, but the rebound is not yet backed by enough participation to call a durable trend reversal. Institutional demand provides support; restrictive macro conditions and weak volume limit conviction. Above $65,000 with stronger volume, the picture improves materially.",
      },
    ],
  },

  nasdaq: {
    taskId: "nasdaq-market-report-2026-08-18",
    label: "Nasdaq Market Report",
    title: "Nasdaq Market Report",
    ticker: "NDX",
    category: "Equity · ETF (index)",
    generatedAt: "2026-08-18 18:03:22 (UTC+8)",
    assignedPortraits: ["G1"],
    canary: "worth watching if price slips toward $27,850.60",
    sections: [
      {
        heading: "Core Conclusion",
        body: "Nasdaq is undergoing a short-term correction within a still-constructive medium-term trend.\n\nThe index closed at $29,731.12, down 1.11%, as elevated Treasury yields and persistent inflation pressure continued to weigh on long-duration technology valuations.\n\nThe key tension is now clear: higher yields are compressing valuations, while softer consumption is weakening growth expectations without yet providing enough disinflation to justify rapid monetary easing.\n\nNear-term bias: bearish below $30,000, with $29,000 the next meaningful downside area. The broader trend remains constructive unless the correction begins to break the medium-term structure.\n\n[Nasdaq stock · NDX Trade entry card]",
      },
      {
        heading: "Market Overview",
        body: "Nasdaq fell 1.11%, or $334.45, closing at $29,731.12 after trading between $29,713.29 and $30,088.82.\n\nThe close near the lower end of the session range indicates renewed short-term selling pressure.\n\nAt the same time, the index remains up 8.54% over one month, meaning the current weakness is better viewed as a correction within a broader advance rather than a confirmed medium-term reversal.\n\nDaily Change: -1.11% (Short-term selling pressure)\nPrice Change: -$334.45 (Weak session)\n1-Week Performance: -1.44% (Correction underway)\n1-Month Performance: +8.54% (Broader uptrend remains intact)",
      },
      {
        heading: "What Is Driving Nasdaq",
        body: "1. Treasury yields are the dominant near-term driver\nThe 30-year Treasury yield reached 5.31%, while the latest auction cleared near 5.22%. For a technology-heavy index, this matters directly: higher risk-free rates increase the discount rate applied to long-duration earnings, putting pressure on equity valuations even when company fundamentals remain unchanged. Heavy Treasury supply and weaker foreign demand are also keeping term premiums elevated, reinforcing the rate headwind.\n\n2. Inflation remains too sticky for an easy policy pivot\nU.S. CPI held at 3.40% YoY and 0.10% MoM. Inflation is no longer accelerating sharply, but it remains high enough to constrain the Federal Reserve's ability to ease policy aggressively. That leaves Nasdaq exposed to a \"higher-for-longer\" rate environment.\n\n3. Growth is weakening at an awkward time\nRetail sales fell 0.60% MoM, while core retail sales declined 0.30%. Normally, weaker consumption could support expectations for easier monetary policy. But with inflation still elevated, softer growth currently creates a less favorable combination: slower demand without immediate relief from high discount rates.\n\n4. FOMC communication is the next catalyst\nThe upcoming FOMC minutes are important because the market needs clarity on whether policymakers are becoming more concerned about slowing growth or remain primarily focused on inflation persistence. A hawkish interpretation would likely keep yields elevated and prolong valuation pressure. A more dovish signal could reduce the discount-rate headwind, but follow-through would still require confirmation from subsequent inflation and labor-market data.",
      },
      {
        heading: "Technical Setup",
        body: "Short-term trend: Nasdaq is below its 10-day MA at $29,897.91, confirming that near-term momentum has weakened.\n\nMedium-term trend: Price remains above the 20-day MA at $29,467.09, while the 10-day MA remains above the 20-day MA. This creates a mixed but coherent structure: short-term corrective, medium-term constructive.\n\nRange: The six-month range is $26,524.21–$30,759.71. At $29,731.12, Nasdaq remains in the upper portion of that range, reinforcing the view that the broader advance has not yet been invalidated.\n\nTechnical Read\nThe index has lost short-term momentum, but the decline has not yet become a structural medium-term breakdown. The current setup therefore favors caution rather than outright trend reversal.",
      },
      {
        heading: "What Changes the View",
        body: "Bullish recovery: A decisive reclaim of $30,000 would reduce immediate downside pressure and suggest buyers are regaining control.\n\nBearish continuation: Failure to stabilize above the 20-day moving average would increase the probability of a deeper correction toward $29,000.",
      },
      {
        heading: "Relevant Catalysts",
        body: "Treasury yields (valuation pressure): The 30-year yield rose to 5.31%, reinforcing the central bearish mechanism for technology valuations.\n\nRetail sales (growth risk): July retail sales contracted 0.60% MoM, strengthening evidence that consumer momentum is weakening.\n\nGeopolitical risk (inflation channel): Renewed U.S.-Iran tensions and disruption around the Strait of Hormuz have supported higher energy prices, creating an additional risk that inflation remains sticky and complicates the Fed's policy path.",
      },
      {
        heading: "Bottom Line",
        body: "Nasdaq's near-term setup has turned bearish, but the broader trend has not yet broken. Elevated yields remain the key pressure point: below $30,000, the correction can extend toward $29,000; a sustained reclaim of $30,000 would materially improve the short-term outlook.",
      },
    ],
  },

  mu: {
    taskId: "mu-market-report-2026-08-27",
    label: "MU Market Report",
    title: "MU Market Report",
    ticker: "MU",
    category: "Equity",
    generatedAt: "2026-08-27 16:16:52",
    assignedPortraits: ["G1", "G3"],
    allowedEmails: ["1-edifice.flaming@icloud.com"],
    canary: "options put/call ratio near 0.54, lowest in a month",
    sections: [
      {
        heading: "Core Conclusion",
        body: "As of publication, MU traded at $914.18, down 0.05% from the previous close. The session range was $906.89 to $925.15, and the key point was that the price remained below its recent 30-day high.\n\nOver the past 30 trading sessions, MU retreated from $980.49 to $914.18 within a range of $906.89 to $983.91. Short-term momentum weakened and volatility increased.\n\nThe macroeconomic data was mixed: core PCE was 0.20%, GDP growth was 1.50%, and initial jobless claims were 203,000. No recent company-specific news was available; upcoming manufacturing and employment data remained in focus.",
      },
      {
        heading: "Market Overview",
        body: "MU traded at $914.18, down 0.05% from the previous close. The session range was $906.89 to $925.15, placing the price in the lower portion of its 30-session range of $906.89 to $983.91. Over the past 30 trading sessions, MU fell from $980.49 to $914.18, indicating weaker short-term momentum. The latest volume was 641,490, below the recent seven-session average of 2.26 million.\n\nToday's Change: -0.05% (Versus previous close)\nChange Amount: -$0.46 (Versus previous close)\nOne-Week Performance: -6.45% (Past five sessions)\nOne-Month Performance: -1.43% (Past 20 sessions)",
      },
      {
        heading: "Key Drivers",
        body: "Persistent inflation: Core PCE at 0.20% month over month and 3.30% year over year kept inflation above a comfortable disinflation path, limiting the scope for rapid monetary easing. For MU, a higher-for-longer rate backdrop could constrain valuation support and corporate technology spending, reinforcing a cautious fundamental bias.\n\nSlower economic growth: GDP growth of 1.50% quarter over quarter, down from 2.10% previously, signaled softer aggregate demand despite resilient pockets of activity. The slower macroeconomic impulse could temper expectations for broad-based semiconductor demand, leaving MU more dependent on memory-cycle strength and data-center investment.\n\nLabor-market resilience: Initial jobless claims of 203,000, below the prior 207,000, supported household income and economic continuity. However, firm employment could also reduce pressure for policy easing. Together with upcoming manufacturing indicators, this left demand expectations balanced rather than decisively supportive for MU.",
      },
      {
        heading: "Technical Analysis",
        body: "Trend Direction: The 10-day moving average was $953.08 and the 20-day moving average was $950.08. The 10-day average was above the 20-day average, but MU at $914.18 was below both, indicating weakening short-term momentum despite a still-positive moving-average structure.\n\nRange Position: MU at $914.18 was near the lower bound of the 30-day range of $906.89 to $983.91, well below the midpoint and still beneath the range high.\n\nTrading Volume: The latest volume was 641,490, compared with a seven-day average of 2.26 million, or 0.28 times the average, indicating contracting trading activity.",
      },
      {
        heading: "Related News",
        body: "No recent news was available.",
      },
    ],
  },

  ibit: {
    taskId: "ibit-market-report-2026-08-27",
    label: "IBIT Market Report",
    title: "IBIT Market Report",
    ticker: "IBIT",
    category: "Crypto ETF",
    generatedAt: "2026-08-27 16:18:22",
    assignedPortraits: ["G1", "G3"],
    allowedEmails: ["1-edifice.flaming@icloud.com"],
    canary: "options put/call ratio near 0.66, lowest in three weeks",
    sections: [
      {
        heading: "Core Conclusion",
        body: "As of publication, IBIT traded at $45.60, up 1.22% from the previous close. The session range was $44.58 to $45.65, placing the price near the upper end of the range.\n\nFund flows were positive. Bitcoin ETFs recently attracted $2.80 billion in inflows as investors rotated from AI exposure into the \"debasement trade.\" A BlackRock executive also said the CLARITY Act was becoming less critical for crypto assets.\n\nTechnical conditions showed that the price had recovered from a low of $43.95 to $45.60, improving short-term momentum. On the macroeconomic side, core PCE inflation was 3.30% year over year and 0.20% month over month, so inflation continued to constrain rate-sensitive assets.",
      },
      {
        heading: "Market Overview",
        body: "IBIT traded at $45.59, up 0.19% from the previous close. The session range was $44.58 to $45.65, placing the price in the upper portion of its 30-session range of $43.95 to $45.79. Volume was 1.70 million, below the recent seven-session average of 4.25 million, indicating lower trading activity.\n\nThe two largest holdings were Bitcoin and U.S. dollar cash, with a combined weight of approximately 100.00%. The portfolio was therefore almost entirely exposed to Bitcoin as a single asset.\n\nToday's Change: +0.19% (Versus previous close)\nChange Amount: $0.08 (Versus previous close)\nOne-Week Performance: +0.98% (Past five sessions)\nOne-Month Performance: +2.41% (Past 20 sessions)",
      },
      {
        heading: "Key Drivers",
        body: "ETF inflows and the debasement trade: Sustained Bitcoin ETF inflows of $2.80 billion indicated a rotation from AI exposure toward assets viewed as hedges against currency and fiscal dilution. This improved the fundamental demand backdrop for IBIT, although the trade remained sensitive to real yields and liquidity conditions.\n\nPersistent inflation constraint: Core PCE inflation remained at 3.30% year over year and 0.20% month over month, keeping price pressures above a level consistent with an easy monetary-policy backdrop. For IBIT, this could limit upside by supporting restrictive-rate expectations and raising the opportunity cost of holding a non-yielding asset.\n\nRegulatory optionality: BlackRock's view that the CLARITY Act was becoming less critical for Bitcoin and other crypto assets reduced near-term dependence on a single legislative catalyst. That supported a market narrative based more on adoption, liquidity, and macroeconomic hedging demand, while tempering event-driven regulatory repricing.",
      },
      {
        heading: "Technical Analysis",
        body: "Trend Direction: The 10-day moving average was $45.18 and the 20-day moving average was $44.78. IBIT at $45.60 was above both averages, with the 10-day average above the 20-day average, indicating stronger short-term momentum than the medium-term trend.\n\nRange Position: The 30-day range was $43.95 to $45.79, with the current price at $45.60. This placed IBIT near the upper bound of the range and was consistent with a recovery from the $43.95 low.\n\nTrading Volume: The latest volume was 1.70 million, compared with a seven-day average of 4.25 million, or 0.40 times the average, indicating contracting participation rather than volume expansion.",
      },
      {
        heading: "Related News",
        body: "Bitcoin ETFs attracted $2.80 billion as investors rotated from artificial-intelligence exposure into the \"debasement trade.\"\n\nA BlackRock executive said the CLARITY Act was \"less critical\" for Bitcoin and other cryptocurrencies.\n\nBernstein projected that Bitcoin could reach $500,000 by 2029, with Strategy potentially reaching $350.",
      },
    ],
  },

  xrp: {
    taskId: "xrp-market-report-2026-08-27",
    label: "XRP Market Report",
    title: "XRP Market Report",
    ticker: "XRP",
    category: "Crypto",
    generatedAt: "2026-08-27 16:15:53",
    assignedPortraits: ["G1", "G3"],
    allowedEmails: ["jdhuge31@gmail.com"],
    canary: "options put/call ratio near 0.59, lowest in a month",
    sections: [
      {
        heading: "Core Conclusion",
        body: "As of publication, XRP was trading near $1.46 after a strong rebound, with ETF inflows and institutional adoption supporting demand.\n\nMomentum was constructive, but an elevated RSI and crowded leverage made $1.40 the key near-term support during any consolidation.\n\nThe outlook remained cautiously bullish above $1.40, with a retest of $1.55 likely if ETF demand persisted. A break below support would weaken the setup.",
      },
      {
        heading: "Market Overview",
        body: "XRP was trading at $1.46, up 2.94%, or $0.04, from the previous daily candlestick close. The partial-day range was $1.39 to $1.47. The rebound remained constructive, but the latest one-week reading was slightly negative, indicating that momentum was improving while consolidation risk persisted. The $1.40 level remained the key near-term support for a potential retest of $1.55.\n\nToday's Change: +2.94% (Rebound continues)\nChange Amount: +$0.04 (Buying momentum)\nOne-Week Performance: -2.17% (Short-term consolidation)\nOne-Month Performance: +37.46% (Strong monthly trend)",
      },
      {
        heading: "Key Drivers",
        body: "Institutional ETF demand: Consecutive spot ETF inflows and new filings indicated sustained institutional capital deployment, increasing the probability of a retest of $1.55 if demand persisted.\n\nEcosystem expansion: Ripple Prime's entry into traditional equities and Mastercard-backed developer support strengthened the adoption case. Broader financial-market integration could reinforce network utility and help sustain demand above $1.40.\n\nMacroeconomic tightening risk: Rising expectations for Federal Reserve rate hikes could reduce risk appetite across digital assets, limiting follow-through and increasing the risk that a loss of $1.40 would weaken the broader setup.",
      },
      {
        heading: "Technical Analysis",
        body: "Trend Direction: The current price of $1.46 was above the 10-day moving average of $1.36 and the 20-day moving average of $1.19. The 10-day average was also above the 20-day average, confirming stronger short-term momentum and supporting a cautiously bullish structure toward $1.55, although the separation left the trend extended.\n\nRange Position: The 30-day range was $0.99 to $1.70, with the current price at $1.46. This placed XRP in the upper portion of the range rather than at the midpoint. The $1.40 area remained the key support, and a sustained break below it would require the rebound structure to be reassessed.\n\nTrading Volume: The latest volume was 113.19 million, compared with a seven-day average of 294.08 million, or 0.38 times the average. Contracting participation was a risk to the ETF- and institutional-demand thesis because a retest of $1.55 would require renewed volume expansion, while continued contraction could limit upside follow-through.",
      },
      {
        heading: "Related News",
        body: "XRP surged 31% following $1.57 billion in spot ETF inflows, while Bitcoin held $78,000.\n\nXRP spot ETFs recorded their second-largest daily inflow of 2026.\n\nXRP whale outflows reached a six-month high as the rally accelerated.",
      },
    ],
  },

  sp500: {
    taskId: "sp500-market-report-2026-08-27",
    label: "S&P 500 Market Report",
    title: "S&P 500 Market Report",
    ticker: "S&P 500",
    category: "Equity Index",
    generatedAt: "2026-08-27 16:11:24",
    assignedPortraits: ["G1", "G3"],
    allowedEmails: ["jdhuge31@gmail.com"],
    canary: "options put/call ratio near 0.91, lowest in six weeks",
    sections: [
      {
        heading: "Core Conclusion",
        body: "As of publication, the S&P 500 was consolidating near 7,744.47 after a sharp rebound. Momentum remained positive, but recent gains were losing breadth.\n\nStrong AI guidance supported technology shares, while inflation and potential semiconductor tariffs could keep valuations sensitive to yields and policy risk.\n\nThe near-term direction was cautiously higher above 7,700, but a break below that level would favor a deeper pullback toward 7,600.",
      },
      {
        heading: "Market Overview",
        body: "The S&P 500 stood at 7,744.46, unchanged from the previous close. The session range was 7,710.92 to 7,746.03, indicating consolidation near the upper end of the recent rebound range. Upside momentum remained intact, but market breadth still required confirmation.\n\nThe near-term bias remained cautiously higher while the index held above 7,700. A sustained break below that level would increase the risk of a deeper pullback toward 7,600. The 30-session range was 7,296.65 to 7,823.62.\n\nToday's Change: 0.00% (Momentum paused)\nChange Amount: 0.00 points (No net change)\nOne-Week Performance: +1.00% (Mild upward bias)\nOne-Month Performance: -0.29% (Monthly trend mixed)",
      },
      {
        heading: "Key Drivers",
        body: "AI capital spending: Nvidia's projection for roughly 70% revenue growth and its stronger earnings outlook reinforced confidence in technology and data-center demand. That supported the cautiously higher bias, but concentration in AI leadership left valuations sensitive to any disappointment.\n\nInflation and Federal Reserve policy: Core PCE inflation remained elevated at 3.30% year over year, while quarterly headline and core measures accelerated to 5.30% and 4.90%. Reduced confidence in near-term easing could keep yields restrictive and limit valuation expansion.\n\nSemiconductor tariff risk: Potential duties on chips and chip-intensive products could raise data-center costs, disrupt supply chains, and pressure corporate margins. Policy uncertainty therefore remained a constraint on technology breadth and could amplify downside risk below key market support.",
      },
      {
        heading: "Technical Analysis",
        body: "Trend Direction: The 10-day moving average was 7,700.47 and the 20-day moving average was 7,734.60. The current level of 7,744.46 was above both averages, while the 10-day average remained below the 20-day average. This indicated that the rebound was consolidating, with short-term momentum not yet stronger than the medium-term trend.\n\nRange Position: The 30-day range high was 7,823.62, the range low was 7,296.65, and the current level was 7,744.46. This placed the index near the upper bound of the range and supported a cautiously higher bias above 7,700, while a break below that level would raise pullback risk toward 7,600.",
      },
      {
        heading: "Related News",
        body: "U.S. second-quarter headline PCE inflation rose 5.30% quarter over quarter, and core PCE accelerated to 4.90%, reducing expectations for a September rate cut.\n\nNvidia's upbeat outlook lifted U.S. stock futures and reinforced confidence in the AI investment cycle.\n\nThe Trump administration was considering broad semiconductor tariffs that could raise costs for data centers and pressure U.S. technology equities.",
      },
    ],
  },
};

// ---------- The three Binance user portraits (guidelines v2.0) ----------

export type Portrait = {
  key: PortraitKey;
  label: string;
  band: string;
  script: string;
  wants: string;
  loses: string;
  mustExplain: string;
  actionCeiling: string;
  riskFraming: string;
  rewriteMust: string;
};

export const PORTRAITS: Portrait[] = [
  {
    key: "G1",
    label: "G1 Novice",
    band: "Sharpness 2 to 3",
    script:
      "I opened a crypto account about four months ago after a friend told me to. I've bought BTC and ETH, and one smaller coin I saw on social media that's now down 40%. Around $800 in total. I check the app most days, mostly to see if I'm up or down. I've seen the Futures tab and I've avoided it deliberately. I've been curious about gold lately because everyone says it's safer. When something big happens in the news I want to know whether it affects me and whether I should be worried. I don't want to be told what to do. I want to understand what's going on.",
    wants:
      "Orientation and reassurance: is something happening that affects my money, and should I be worried or relaxed about it?",
    loses:
      "Three unfamiliar terms in the first two sentences; a price trigger with no explanation of what to do with it or what happens if it's wrong.",
    mustExplain:
      "Funding rate; open interest; liquidation; leverage mechanics; perpetual/basis; TVL; support and resistance; RSI and moving averages; real interest rates; basis points; gold/silver ratio; contango/roll; ETF vs. stock; DXY; CPI, NFP, FOMC (name and mechanism); risk-on/risk-off.",
    actionCeiling:
      "Directional takeaway plus what to watch. No entries, stops, targets, or leverage tactics, ever.",
    riskFraming: "Mandatory, plain language, prominent.",
    rewriteMust:
      "A plain-language takeaway, every term from the G1 must-explain list handled in line, prominent plain risk framing. No entries, stops, targets, or leverage tactics.",
  },
  {
    key: "G2",
    label: "G2 Experienced trader",
    band: "Sharpness 3 to 4",
    script:
      "Script A (crypto-native): I've been trading crypto for a couple of years. I run perps at 3 to 5x, I watch funding when I hold overnight. Maybe 40 trades a month across 8 or 10 assets. I mark my levels and I always know where I'm wrong before I enter. I've started trading gold and Nasdaq here too. The charts work the same way, but honestly I don't really know why gold does what it does around Fed meetings. Script B (multi-platform): Crypto is where I'm most active day to day, but it isn't my only market. I've had a brokerage account for years. I hold US equities, I write covered calls, I've traded ETFs through two cycles. What I don't need is a report explaining CPI to me. Same ask as anyone else here: what's the setup and where am I wrong.",
    wants:
      "A setup with an invalidation level: is there a setup here, what's actually driving it, and where am I wrong?",
    loses:
      "Hedged both-sides language that resolves to nothing; a directional view with no level attached; being taught something they already know.",
    mustExplain:
      "Macro mechanisms only, as an inline gloss of 5 to 12 words embedded in the sentence that uses them (why real yields drive gold, gold/silver ratio, contango, DXY mechanics, why Nasdaq and BTC co-move). Never a teaching paragraph, never omitted where the mechanism carries the argument. Trading terms are never explained.",
    actionCeiling: "Levels, triggers, invalidation. Scenario paths fine.",
    riskFraming: "Present as an invalidation condition.",
    rewriteMust:
      "Direction plus driver plus invalidation level. Trading structure assumed. Any macro mechanism that carries the argument appears as an inline gloss of 5 to 12 words. No basics.",
  },
  {
    key: "G3",
    label: "G3 Professional",
    band: "Sharpness 4 to 5",
    script:
      "I trade full time or I do this professionally. Six-figure book minimum, often larger. I run basis and funding carry trades, I hedge with options, I use the API. I think in cross-asset terms: real yields, DXY, term structure, positioning. I already know today's data prints and where consensus sits before I open anything you send me. If a report tells me what happened, it has wasted my time. The only thing worth my attention is a differentiated read: a data series I'm not watching, or an argument that the consensus interpretation is wrong.",
    wants:
      "A differentiated, contestable read: what's the non-consensus angle, what is the market mispricing, and what's the evidence?",
    loses:
      "Anything they already know; generic macro recitation; an unsourced claim; a view with no falsification condition.",
    mustExplain:
      "Nothing. Explanation is noise. What earns attention is a data series they may not be tracking, and that must be sourced, not asserted.",
    actionCeiling: "Full relative-value and structural expression.",
    riskFraming: "Assumed; state it as falsification.",
    rewriteMust:
      "Explicit trigger (if [indicator] [threshold] then [view changes]), price boundaries, at least one instrument-specific factor, full scenario paths. Target 5 where you can support a sourced mispricing thesis.",
  },
];

// ---------- Q2 reason lists ----------

export const Q2_UNSOUND_REASONS = [
  "Causal direction is wrong (inference runs opposite to market mechanics)",
  "Transmission chain missing a critical link (jumps A to C)",
  "Conclusion contradicts the data the report itself cites",
  "Contradicts market consensus or historical regularity with no explanation for the anomaly",
];

export const Q2_INSUFFICIENT_REASONS = [
  "Data recitation only, no causal explanation",
  "Conclusion too vague, no next step guidance",
  "Templated boilerplate, low information gain",
];
