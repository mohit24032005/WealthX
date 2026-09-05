/**
 * WealthX Investor Quest - AI Financial Mentor Service
 * Powers "🤖 WealthX Mentor" explanations for turn decisions, consequences,
 * and answers user questions about their simulated game state.
 * 
 * Includes 100% deterministic fallback when Gemini API is unconfigured or offline.
 */

const { GoogleGenAI } = require("@google/genai");

let genAIClient = null;

const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
};

/**
 * Generate AI Mentor explanation for a turn decision and event
 */
const explainTurnConsequence = async ({
  turnRecord = {},
  gameState = {},
  decision = {},
}) => {
  const client = getGenAIClient();
  const event = turnRecord.event || {};
  const allocType = decision.allocationType || "balanced_split";

  const buildFallbackExplanation = () => {
    let headline = `Turn ${turnRecord.turnNumber} Review: Disciplined Execution`;
    let reason = "Your allocation choices balanced current liquidity needs with long-term compounding growth.";
    let lesson = event.lesson || "Consistent systematic investing through market cycles is the cornerstone of wealth creation.";

    if (event.id === "market_correction") {
      headline = "📉 Understanding Market Corrections";
      reason = "Equity prices pulled back due to macroeconomic shifts. Because you maintained a diversified allocation, your overall portfolio suffered less drawdown than a 100% equity strategy.";
      lesson = "Temporary market pullbacks are the price of admission for long-term equity compounding. Staying invested prevents locking in permanent capital losses.";
    } else if (event.id === "unexpected_medical") {
      headline = "🛡️ Emergency Buffer in Action";
      reason = turnRecord.eventConsequenceSummary || "Your emergency fund protected your long-term mutual fund SIPs from being liquidated.";
      lesson = "Emergency funds act as the foundation of your financial pyramid, insulating productive compounding assets from unexpected life disruptions.";
    } else if (event.id === "bull_market_rally") {
      headline = "📈 Riding the Economic Expansion";
      reason = "Your equity and mutual fund holdings grew strongly as economic earnings expanded.";
      lesson = "Staying disciplined through previous consolidation phases allowed your portfolio to participate fully in the bull market run.";
    } else if (event.id === "career_promotion") {
      headline = "💼 Expanding Your Compounding Engine";
      reason = "Your 15% salary increase significantly increases your monthly surplus, allowing you to increase your SIP contributions.";
      lesson = "Accelerating savings rates from career increments has a more powerful impact on financial independence than chasing risky high-beta stocks.";
    }

    return {
      isAI: false,
      mentorName: "WealthX Mentor",
      headline,
      reason,
      lesson,
      strategyTip: "Maintain at least 6 months of expenses in emergency reserves before aggressive equity risk.",
    };
  };

  if (!client) {
    return buildFallbackExplanation();
  }

  try {
    const prompt = `
You are "WealthX Mentor", an elite, supportive, institutional-grade financial educator guiding a user through an educational investment game ("Investor Quest").

CURRENT GAME STATE:
- Turn: ${turnRecord.turnNumber} of ${gameState.totalTurns || 12}
- Monthly Income: ₹${Number(gameState.monthlyIncome || 50000).toLocaleString("en-IN")}
- Monthly Expenses: ₹${Number(gameState.monthlyExpenses || 30000).toLocaleString("en-IN")}
- Emergency Fund Balance: ₹${Number(gameState.emergencyFund || 0).toLocaleString("en-IN")}
- Total Portfolio: ₹${Number(turnRecord.totalInvestments || 0).toLocaleString("en-IN")} (Stocks: ₹${gameState.portfolio?.stocks || 0}, Mutual Funds: ₹${gameState.portfolio?.mutual_funds || 0}, Gold: ₹${gameState.portfolio?.gold || 0})
- User Decision This Turn: "${allocType}" (Allocated ₹${Number(turnRecord.allocatedSurplus || 0).toLocaleString("en-IN")})
- Event Triggered: "${event.title || "Standard Market Cycle"}"
- Event Consequence: "${turnRecord.eventConsequenceSummary || "Normal compounding"}"

INSTRUCTIONS:
1. Explain WHY the portfolio responded the way it did to this event and decision.
2. If it was a market correction, explain sequence-of-returns and volatility without fearmongering.
3. If it was an emergency, explain how their emergency buffer protected or stressed their finances.
4. Keep the tone encouraging, calm, and educational.

Return valid JSON conforming to:
{
  "headline": "Brief catchy headline",
  "reason": "2-3 concise sentences explaining what happened and why.",
  "lesson": "1 core takeaway financial concept learned from this turn.",
  "strategyTip": "1 practical rule of thumb for the next turn."
}
`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text.trim());
    return {
      isAI: true,
      mentorName: "WealthX Mentor (Gemini AI)",
      headline: parsed.headline || "Turn Analysis",
      reason: parsed.reason,
      lesson: parsed.lesson,
      strategyTip: parsed.strategyTip,
    };
  } catch (err) {
    console.warn("Gemini AI Mentor fallback invoked:", err.message);
    return buildFallbackExplanation();
  }
};

/**
 * Interactive "Ask WealthX Mentor" during gameplay
 */
const askMentorQuestion = async ({
  question = "",
  gameState = {},
}) => {
  const client = getGenAIClient();

  const buildFallbackAnswer = () => {
    const qLower = question.toLowerCase();
    let answer = "In Investor Quest, your objective is balancing liquidity security (emergency fund) with long-term purchasing power expansion (equities and mutual funds).";

    if (qLower.includes("fall") || qLower.includes("down") || qLower.includes("loss") || qLower.includes("correction")) {
      answer = "Your portfolio experienced simulated volatility because a portion of your wealth is allocated to growth assets like equities. Over short horizons (months), stock prices fluctuate, but over long horizons (5–10 years), diversified equities have historically outpaced inflation.";
    } else if (qLower.includes("emergency") || qLower.includes("cash")) {
      answer = `Your current emergency buffer is ₹${Number(gameState.emergencyFund || 0).toLocaleString("en-IN")}. Having 6 months of living expenses (₹${Number((gameState.monthlyExpenses || 30000) * 6).toLocaleString("en-IN")}) ensures unexpected events never force you to sell your investments at a loss.`;
    } else if (qLower.includes("diversif") || qLower.includes("gold") || qLower.includes("split")) {
      answer = "Diversification means not putting all your eggs in one basket. By holding mutual funds, stocks, and gold, losses in one asset class during corrections are cushioned by resilience in others.";
    } else if (qLower.includes("sip") || qLower.includes("increase")) {
      answer = "Increasing your SIP systematically channels more of your monthly surplus into compounding, dramatically accelerating your milestone goal attainment without requiring market timing.";
    }

    return {
      isAI: false,
      mentorName: "WealthX Mentor",
      question,
      answer,
      conceptTip: "Discipline and asset allocation drive >90% of long-term investment success.",
    };
  };

  if (!client) {
    return buildFallbackAnswer();
  }

  try {
    const prompt = `
You are "WealthX Mentor", the AI financial literacy coach in the Investor Quest game.
A player has paused the simulation to ask you a question about their current situation.

CURRENT GAME SITUATION:
- Turn: ${gameState.currentTurn} of ${gameState.totalTurns || 12}
- Net Worth: ₹${Number((gameState.portfolio?.stocks || 0) + (gameState.portfolio?.mutual_funds || 0) + (gameState.portfolio?.gold || 0) + (gameState.emergencyFund || 0) + (gameState.liquidCash || 0) - (gameState.debt || 0)).toLocaleString("en-IN")}
- Emergency Fund: ₹${Number(gameState.emergencyFund || 0).toLocaleString("en-IN")}
- Monthly Income: ₹${Number(gameState.monthlyIncome || 0).toLocaleString("en-IN")}
- Monthly Expenses: ₹${Number(gameState.monthlyExpenses || 0).toLocaleString("en-IN")}
- Goal Progress: ${Math.round((((gameState.portfolio?.stocks || 0) + (gameState.portfolio?.mutual_funds || 0) + (gameState.emergencyFund || 0)) / (gameState.goal?.targetAmount || 500000)) * 100)}%
- Risk DNA: ${gameState.riskCategoryLabel || "Moderate Growth"}

USER QUESTION: "${question}"

GUIDELINES:
- Answer in 2-3 clear, educational paragraphs.
- Reference their exact numbers where appropriate.
- Explain the underlying financial theory (e.g. sequence-of-returns, emergency cushion, inflation drag, dollar-cost averaging).
- Be supportive, pedagogical, and clear.
`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.25,
      },
    });

    return {
      isAI: true,
      mentorName: "WealthX Mentor (Gemini AI)",
      question,
      answer: response.text.trim(),
      conceptTip: "Calibrate decisions to your overall balance sheet rather than short-term price movements.",
    };
  } catch (err) {
    console.warn("Ask mentor fallback invoked:", err.message);
    return buildFallbackAnswer();
  }
};

module.exports = {
  explainTurnConsequence,
  askMentorQuestion,
};
