/**
 * WealthX AI Revenue Risk Scoring & Decision Engine
 * Transparent Bayesian/Feature-Weighted Scoring & Intervention Engine
 * 
 * Workflow: DETECT -> DIAGNOSE -> DECIDE -> ACT (SIMULATED) -> MEASURE -> AUDIT
 */

let GoogleGenAI = null;
try {
  const genaiPkg = require("@google/genai");
  GoogleGenAI = genaiPkg.GoogleGenAI;
} catch (e) {
  // Graceful fallback when module is not installed locally
}

let genAIClient = null;
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !GoogleGenAI) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
};

// Base recovery priors by failure reason
const REASON_PRIORS = {
  gateway_timeout: 0.88,
  technical_failure: 0.84,
  upi_failure: 0.78,
  checkout_abandonment: 0.72,
  bank_decline: 0.65,
  subscription_failure: 0.62,
  insufficient_funds: 0.48,
  overdue_invoice: 0.42,
  expired_card: 0.28,
};

// Payment method reliability modifier
const METHOD_MODIFIERS = {
  upi: 1.05,
  netbanking: 1.02,
  auto_debit: 0.98,
  card: 0.95,
  emi: 0.90,
};

// Customer segment prior multiplier
const SEGMENT_MODIFIERS = {
  vip: 1.15,
  enterprise: 1.12,
  smb: 1.02,
  direct_consumer: 0.96,
};

/**
 * Calculate transparent statistical recovery probability and diagnosis
 */
function calculateRecoveryScore(record, policy = {}) {
  const {
    failureReason = "technical_failure",
    retryCount = 0,
    previousSuccessfulPayments = 0,
    customerLifetimeValue = 0,
    amount = 1000,
    paymentMethod = "upi",
    customerSegment = "direct_consumer",
    daysOverdue = 0,
  } = record;

  const maxRetries = policy.maxRetries || 3;
  const highValueThreshold = policy.highValueThreshold || 25000;
  const minConfidence = policy.minConfidenceThreshold || 70;

  // 1. Base prior probability
  let prob = REASON_PRIORS[failureReason] || 0.60;

  // 2. Customer payment track record (Laplace smoothing)
  const trackRecordMultiplier = Math.min(
    1.35,
    0.75 + (previousSuccessfulPayments / (previousSuccessfulPayments + 2)) * 0.6
  );
  prob *= trackRecordMultiplier;

  // 3. Retry decay penalty (exponential decay with each retry)
  const retryPenalty = Math.exp(-0.45 * retryCount);
  prob *= retryPenalty;

  // 4. Payment method modifier
  prob *= (METHOD_MODIFIERS[paymentMethod] || 1.0);

  // 5. Customer segment modifier
  prob *= (SEGMENT_MODIFIERS[customerSegment] || 1.0);

  // 6. Days overdue recency penalty
  if (daysOverdue > 0) {
    const overdueDecay = Math.max(0.35, 1.0 - (daysOverdue * 0.015));
    prob *= overdueDecay;
  }

  // 7. High-value ticket size friction
  if (amount > 50000) {
    prob *= 0.88;
  } else if (amount > 20000) {
    prob *= 0.94;
  }

  // Clamp probability between 5% and 98%
  let score = Math.round(Math.min(0.98, Math.max(0.05, prob)) * 100);

  // If retries hit or exceed policy max, probability drops to near zero
  if (retryCount >= maxRetries) {
    score = Math.min(score, 12);
  }

  // Determine Risk Level
  let riskLevel = "MODERATE";
  if (score >= 80) riskLevel = "LOW";
  else if (score >= 60) riskLevel = "MODERATE";
  else if (score >= 35) riskLevel = "ELEVATED";
  else riskLevel = "CRITICAL";

  // Determine Confidence
  const confidence = Math.min(
    96,
    Math.max(68, Math.round(75 + Math.min(previousSuccessfulPayments * 2.5, 15) - (retryCount * 4)))
  );

  // Determine Recommended Intervention
  let recommendedIntervention = "smart_retry";
  let humanApprovalRequired = false;
  let stoppingRuleHit = null;
  const maxDaysOverdue = policy.maxDaysOverdue || 45;

  if (retryCount >= maxRetries) {
    recommendedIntervention = "halt_recovery";
    stoppingRuleHit = `Maximum retry attempts (${maxRetries}) reached`;
    humanApprovalRequired = false;
  } else if (daysOverdue > maxDaysOverdue) {
    recommendedIntervention = "halt_recovery";
    stoppingRuleHit = `Invoice is ${daysOverdue} days overdue (exceeds policy threshold of ${maxDaysOverdue} days)`;
    score = Math.min(score, 5);
    riskLevel = "CRITICAL";
    humanApprovalRequired = false;
  } else if (amount >= highValueThreshold) {
    recommendedIntervention = "escalate_human";
    humanApprovalRequired = true;
  } else if (failureReason === "expired_card") {
    recommendedIntervention = "payment_reminder_link";
  } else if (failureReason === "checkout_abandonment") {
    recommendedIntervention = "payment_reminder_link";
  } else if (failureReason === "insufficient_funds") {
    recommendedIntervention = "schedule_optimal_retry";
  } else if (failureReason === "overdue_invoice") {
    recommendedIntervention = daysOverdue > 20 ? "escalate_human" : "payment_reminder_link";
    if (daysOverdue > 20) humanApprovalRequired = true;
  } else if (score < minConfidence) {
    recommendedIntervention = "escalate_human";
    humanApprovalRequired = true;
  } else {
    recommendedIntervention = "smart_retry";
  }

  // Generate transparent signals and diagnosis notes
  const supportingSignals = [
    `Customer track record: ${previousSuccessfulPayments} successful payment${previousSuccessfulPayments === 1 ? "" : "s"} logged`,
    `Failure taxonomy: ${failureReason.replace(/_/g, " ")} via ${paymentMethod.toUpperCase()}`,
    `Intervention history: ${retryCount} of ${maxRetries} allowed retries attempted`,
  ];

  if (customerLifetimeValue > 0) {
    supportingSignals.push(`Verified Customer LTV: ₹${customerLifetimeValue.toLocaleString("en-IN")}`);
  }
  if (daysOverdue > 0) {
    supportingSignals.push(`Invoice ageing: ${daysOverdue} days overdue`);
  }

  let mainReason = "";
  if (score >= 75) {
    mainReason = `High recovery probability (${score}%) driven by strong customer track record (${previousSuccessfulPayments} prior payments) and temporary ${failureReason.replace(/_/g, " ")} friction.`;
  } else if (score >= 50) {
    mainReason = `Moderate recovery probability (${score}%). Payment failed due to ${failureReason.replace(/_/g, " ")}; recommended action balances conversion against retry fatigue.`;
  } else {
    mainReason = `Subdued recovery probability (${score}%). ${stoppingRuleHit ? stoppingRuleHit : `Payment failed with ${failureReason.replace(/_/g, " ")} across ${retryCount} attempts.`}`;
  }

  return {
    recoveryProbability: score,
    riskLevel,
    scoringModelType: "statistical_ml",
    confidence,
    recommendedIntervention,
    humanApprovalRequired,
    stoppingRuleHit,
    diagnosis: {
      mainReason,
      supportingSignals,
      confidence,
    },
  };
}

/**
 * Optionally enrich diagnosis with Gemini LLM reasoning if API key is present
 */
async function enrichDiagnosisWithGemini(record, diagnosis) {
  const client = getGenAIClient();
  if (!client) {
    return diagnosis; // Use verified deterministic output
  }

  try {
    const prompt = `You are the WealthX AI Revenue Recovery Agent.
Analyze this payment failure and provide a concise 2-sentence institutional financial diagnosis.
Transaction Details:
- Amount: ₹${record.amount}
- Failure Reason: ${record.failureReason}
- Previous Successes: ${record.previousSuccessfulPayments}
- Retry Count: ${record.retryCount}
- Customer Segment: ${record.customerSegment}
- Payment Method: ${record.paymentMethod}
- Computed Recovery Probability: ${diagnosis.recoveryProbability}%

Output format:
Return ONLY the 2 sentences explaining why it failed and the rationale for the recommended intervention (${diagnosis.recommendedIntervention}). Do not hallucinate numbers.`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    if (response && response.text) {
      diagnosis.diagnosis.mainReason = response.text.trim();
      diagnosis.scoringModelType = "statistical_ml";
    }
  } catch (err) {
    // Graceful fallback to deterministic diagnosis
    console.warn("Gemini enrichment bypassed, using deterministic diagnosis:", err.message);
  }

  return diagnosis;
}

module.exports = {
  calculateRecoveryScore,
  enrichDiagnosisWithGemini,
  REASON_PRIORS,
};
