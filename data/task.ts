export type TaskKey = "sol" | "btc" | "nasdaq";
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
  // Fixed for this pilot: which portrait every rewrite of this report must
  // target. No longer a choice the attempter makes.
  assignedPortrait: PortraitKey;
  // A fabricated, precise micro-fact (a specific price/level, framed as
  // ordinary technical-analysis language) that never appears anywhere in
  // the visible report. Rendered as genuine in-flow text - color-matched
  // to the report panel's white background and set to a near-zero font
  // size - rather than being taken out of the layout entirely (an earlier
  // version used position:absolute + clip, which is invisible to a human
  // AND to a normal copy-paste selection, since a mouse-drag or Ctrl+A
  // follows visual layout and never sweeps over a clipped, off-screen
  // element - that version never survived a human manually copying the
  // report). Being in-flow means any selection method - manual drag,
  // Ctrl+A, or a script reading the DOM - picks it up the same way. A
  // human working only from the visible page has no way to reproduce this
  // exact figure by accident; if it turns up in a submission, that's
  // strong evidence the report's actual page content (not just a
  // screenshot or a human's own reading of it) made it into the pipeline
  // that produced the rewrite.
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

export const TASK_ORDER: TaskKey[] = ["sol", "btc", "nasdaq"];

export const REPORTS: Record<TaskKey, ReportTask> = {
  sol: {
    taskId: "sol-market-report-2026-08-18",
    label: "SOL Market Report",
    title: "SOL Market Report",
    ticker: "SOLUSDT",
    category: "Crypto",
    generatedAt: "2026-08-18 18:13:23 (UTC+8)",
    assignedPortrait: "G3",
    canary: "secondary support seen near $71.38",
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
    assignedPortrait: "G1",
    canary: "secondary support seen near $62,847.30",
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
    assignedPortrait: "G2",
    canary: "secondary support seen near $29,102.55",
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
