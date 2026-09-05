/**
 * WealthX Gemini AI Intelligence Service
 * Uses Google Gemini API as the natural language reasoning and explanation layer.
 * Grounded strictly in verified balance sheet metrics, Risk DNA, AMFI NAVs, and Upstox market data.
 */

const { GoogleGenAI } = require("@google/genai");

let genAIClient = null;

const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
};

/**
 * Generate natural language explanation for a financial decision grounded in real context
 */
const explainFinancialDecision = async ({
  query = "",
  conversationHistory = [],
  financialContext = {},
}) => {
  const client = getGenAIClient();
  const decisionState = financialContext.decisionState || "REVIEW";

  // Deterministic fallback generator when Gemini API is offline, unconfigured, or timed out
  const buildFallbackResponse = (sourceReason = "") => ({
    isAI: false,
    provider: "WealthX Deterministic Rule Engine",
    summary:
      financialContext.summary ||
      `Based on your balance sheet and ${financialContext.riskCategoryLabel || "Moderate Growth"} profile, your current decision state is evaluated as ${decisionState}.`,
    decision: decisionState,
    reasons: financialContext.reasons && financialContext.reasons.length > 0 ? financialContext.reasons : [
      `Aligns with your calibrated ${financialContext.riskCategoryLabel || "Moderate Growth"} risk posture (Risk Score: ${financialContext.riskScore || 58}/100).`,
      `Supports disciplined monthly compounding from your ₹${Number(financialContext.surplus || 0).toLocaleString("en-IN")}/mo surplus.`,
    ],
    risks: financialContext.risks && financialContext.risks.length > 0 ? financialContext.risks : [
      "Market investments are subject to capital drawdowns during cyclical corrections.",
      `Ensure minimum 3 to 6 months of emergency buffer (currently: ${financialContext.emergencyMonths || 0} months).`,
    ],
    riskDNACompatibility:
      financialContext.riskDNACompatibility ||
      `Compatible with your ${financialContext.riskCategoryLabel || "Moderate Growth"} blueprint and ${financialContext.investmentHorizonYears || 7}-year horizon.`,
    goalCompatibility:
      financialContext.goalCompatibility ||
      "Channels surplus into productive compounding without delaying active milestone goals.",
    portfolioImpact:
      financialContext.portfolioImpact ||
      `Current portfolio holds ${financialContext.equityExposurePct || 0}% Equity and ${financialContext.debtExposurePct || 0}% Debt.`,
    suggestedAction:
      financialContext.suggestedAction?.text || "Simulate SIP in Decision Lab",
    suggestedActionRoute:
      financialContext.suggestedAction?.route || "/calculators/sip",
    followUpPrompts: [
      "What if I invest ₹5,000 every month instead?",
      "Is my portfolio too risky compared to my Risk DNA?",
      "Where should my next ₹10,000 surplus go?",
    ],
    disclaimer:
      "WealthX AI Decision Lab provides educational and algorithmic analysis grounded in available balance sheet data. It is not SEBI/RBI registered investment advice.",
    aiSource: sourceReason || "Local Analytical Engine",
  });

  if (!client) {
    return buildFallbackResponse("GEMINI_API_KEY unconfigured");
  }

  const systemInstruction = `
You are the WealthX AI Financial Intelligence Co-pilot, an institutional-grade fintech analytical assistant.
Your job is to explain financial decisions and answer user inquiries with calm, elegant, and professional reasoning.

CRITICAL FINANCIAL GUARDRAILS:
1. Ground every sentence in the provided VERIFIED FINANCIAL CONTEXT.
2. DO NOT invent, guess, or hallucinate NAVs, stock prices, historical returns, suitability scores, or user balance sheet numbers.
3. The deterministic backend has already evaluated the decision state: "${decisionState}". YOU MUST RESPECT THIS DECISION STATE ("CONSIDER", "REVIEW", "WATCH", or "NOT_SUITABLE"). Do NOT override it to "BUY" or make market-timing predictions.
4. For SIP and investment inquiries, emphasize financial readiness (emergency buffer, debt load, savings rate) and disciplined long-term compounding.
5. If specific mutual fund or stock candidate data is provided in context, explain why it matches or differs from the user's profile using the exact numbers given.
6. Return ONLY valid JSON conforming to the requested schema.
`;

  const promptPayload = `
USER QUERY: "${query}"

VERIFIED USER FINANCIAL CONTEXT:
- Monthly Income: ₹${Number(financialContext.income || 0).toLocaleString("en-IN")}
- Monthly Living Expenses: ₹${Number(financialContext.expenses || 0).toLocaleString("en-IN")}
- Monthly Net Surplus: ₹${Number(financialContext.surplus || 0).toLocaleString("en-IN")}
- Savings Rate: ${financialContext.savingsRate || 0}%
- Emergency Liquid Runway: ${financialContext.emergencyMonths || 0} Months (Status: ${financialContext.emergencyStatus || "uncalibrated"})
- Financial Health Score: ${financialContext.healthScore || 50}/100
- Risk DNA: Score ${financialContext.riskScore || 58}/100 (${financialContext.riskCategoryLabel || "Moderate Growth"})
- Existing Portfolio Asset Breakdown: Equity ${financialContext.equityExposurePct || 0}%, Debt ${financialContext.debtExposurePct || 0}%, Gold ${financialContext.goldExposurePct || 0}%, Cash ${financialContext.cashExposurePct || 0}%
- Total Tracked Net Worth: ₹${Number(financialContext.netWorth || 0).toLocaleString("en-IN")}
- Active Debt Load (DTI): ${financialContext.emiBurdenPct || 0}% EMI burden
- Evaluated Decision State: ${decisionState}
- Candidate Mutual Funds (if applicable): ${JSON.stringify(financialContext.recommendations || [])}
- Candidate Stocks (if applicable): ${JSON.stringify(financialContext.researchStocks || [])}
- Dynamic Rupee Allocation (if applicable): ${JSON.stringify(financialContext.allocationPlan || {})}
- Conversation History: ${JSON.stringify(conversationHistory.slice(-4))}

Generate a structured JSON response with these exact keys:
{
  "summary": "Concise, punchy 2-3 sentence conversational answer addressing the user directly",
  "decision": "${decisionState}",
  "reasons": ["Point 1", "Point 2", "Point 3"],
  "risks": ["Risk/Caution 1", "Risk/Caution 2"],
  "riskDNACompatibility": "Sentence explaining alignment with Risk DNA score and category",
  "goalCompatibility": "Sentence explaining impact on milestone targets or liquidity",
  "portfolioImpact": "Sentence explaining how this affects their current equity/debt balance",
  "suggestedAction": "Concrete next recommended step",
  "followUpPrompts": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"],
  "disclaimer": "WealthX AI Decision Lab provides educational and algorithmic analysis grounded in available balance sheet data. It is not SEBI/RBI registered investment advice."
}
`;

  try {
    const modelsToTry = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.5-flash"];
    let rawText = null;
    let successfulModel = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await Promise.race([
          client.models.generateContent({
            model: modelName,
            contents: promptPayload,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000)),
        ]);

        if (response && response.text) {
          rawText = response.text;
          successfulModel = modelName;
          break;
        }
      } catch {
        // Try next model in sequence
      }
    }

    if (!rawText) {
      return buildFallbackResponse("AI model did not return text");
    }

    const parsed = JSON.parse(rawText);
    return {
      isAI: true,
      provider: `Google ${successfulModel}`,
      summary: parsed.summary || financialContext.summary,
      decision: decisionState, // Enforce deterministic decision state
      reasons: parsed.reasons || financialContext.reasons || [],
      risks: parsed.risks || financialContext.risks || [],
      riskDNACompatibility: parsed.riskDNACompatibility || "",
      goalCompatibility: parsed.goalCompatibility || "",
      portfolioImpact: parsed.portfolioImpact || "",
      suggestedAction: parsed.suggestedAction || financialContext.suggestedAction?.text || "Simulate SIP",
      suggestedActionRoute: financialContext.suggestedAction?.route || "/calculators/sip",
      followUpPrompts: parsed.followUpPrompts || [
        "What if I invest ₹5,000 every month instead?",
        "Is my portfolio too risky compared to my Risk DNA?",
        "Where should my next ₹10,000 surplus go?",
      ],
      disclaimer: parsed.disclaimer || "WealthX AI Decision Lab provides educational and algorithmic analysis grounded in available balance sheet data. It is not SEBI/RBI registered investment advice.",
    };
  } catch (err) {
    console.error("Gemini service error:", err.message);
    return buildFallbackResponse(err.message);
  }
};

module.exports = {
  explainFinancialDecision,
};
