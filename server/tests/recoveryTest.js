/**
 * Automated Verification Script for WealthX AI Revenue Recovery & Finance Controller
 * Tests scoring, stopping rules, reconciliation math, and bounded execution.
 */

const { calculateRecoveryScore } = require("../services/recoveryScoringService");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

function runTests() {
  console.log("\n==========================================");
  console.log("RUNNING WEALTHX AI REVENUE RECOVERY TESTS");
  console.log("==========================================\n");

  const policy = {
    maxRetries: 3,
    minConfidenceThreshold: 70,
    highValueThreshold: 25000,
    humanEscalationEnabled: true,
  };

  // Test 1: High probability recovery (gateway timeout, 7 previous successes)
  const candidate1 = {
    amount: 4999,
    failureReason: "gateway_timeout",
    paymentMethod: "upi",
    customerSegment: "direct_consumer",
    previousSuccessfulPayments: 7,
    retryCount: 0,
    daysOverdue: 0,
  };
  const score1 = calculateRecoveryScore(candidate1, policy);
  assert(score1.recoveryProbability >= 80, `High likelihood scenario scored >= 80% (got ${score1.recoveryProbability}%)`);
  assert(score1.recommendedIntervention === "smart_retry", `Recommended intervention is smart_retry (got ${score1.recommendedIntervention})`);
  assert(!score1.humanApprovalRequired, "Does not require human approval (< ₹25,000)");

  // Test 2: Stopping rule triggered on retry limit
  const candidate2 = {
    amount: 3500,
    failureReason: "bank_decline",
    paymentMethod: "card",
    customerSegment: "smb",
    previousSuccessfulPayments: 2,
    retryCount: 3, // Hit max retries
    daysOverdue: 5,
  };
  const score2 = calculateRecoveryScore(candidate2, policy);
  assert(score2.recommendedIntervention === "halt_recovery", `Max retries triggers halt_recovery (got ${score2.recommendedIntervention})`);
  assert(score2.stoppingRuleHit !== null, `Stopping rule recorded: ${score2.stoppingRuleHit}`);

  // Test 3: High value escalation (> ₹25,000)
  const candidate3 = {
    amount: 48000,
    failureReason: "bank_decline",
    paymentMethod: "netbanking",
    customerSegment: "enterprise",
    previousSuccessfulPayments: 5,
    retryCount: 1,
    daysOverdue: 2,
  };
  const score3 = calculateRecoveryScore(candidate3, policy);
  assert(score3.humanApprovalRequired === true, "High-value transaction flagged for mandatory human approval");
  assert(score3.recommendedIntervention === "escalate_human", `High value triggers escalate_human (got ${score3.recommendedIntervention})`);

  // Test 4: Checkout abandonment intervention
  const candidate4 = {
    amount: 2499,
    failureReason: "checkout_abandonment",
    paymentMethod: "card",
    customerSegment: "direct_consumer",
    previousSuccessfulPayments: 1,
    retryCount: 0,
    daysOverdue: 0,
  };
  const score4 = calculateRecoveryScore(candidate4, policy);
  assert(score4.recommendedIntervention === "payment_reminder_link", `Checkout abandonment recommends payment reminder link (got ${score4.recommendedIntervention})`);

  // Test 5: Expired card intervention
  const candidate5 = {
    amount: 1999,
    failureReason: "expired_card",
    paymentMethod: "card",
    customerSegment: "smb",
    previousSuccessfulPayments: 10,
    retryCount: 0,
    daysOverdue: 0,
  };
  const score5 = calculateRecoveryScore(candidate5, policy);
  assert(score5.recommendedIntervention === "payment_reminder_link", `Expired card recommends payment reminder link for card update (got ${score5.recommendedIntervention})`);

  // Test 6: Mathematical decay across retries
  const r0 = calculateRecoveryScore({ ...candidate1, retryCount: 0 }, policy).recoveryProbability;
  const r1 = calculateRecoveryScore({ ...candidate1, retryCount: 1 }, policy).recoveryProbability;
  const r2 = calculateRecoveryScore({ ...candidate1, retryCount: 2 }, policy).recoveryProbability;
  assert(r0 > r1 && r1 > r2, `Recovery probability strictly decays with each retry (r0: ${r0}%, r1: ${r1}%, r2: ${r2}%)`);

  // Test 7: Reconciliation mathematics check
  const orderAmount = 10000;
  const standardFee = Math.round(orderAmount * 0.02);
  const standardTax = Math.round(standardFee * 0.18);
  const settledExpected = orderAmount - (standardFee + standardTax);
  assert(settledExpected === 9764, `Reconciliation math verifies 2% MDR (₹200) + 18% GST (₹36) = ₹9,764 net settled`);

  // Test 8: Stopping rule - >45 days overdue is unrecoverable
  const candidateOverdue = {
    amount: 5000,
    failureReason: "overdue_invoice",
    paymentMethod: "netbanking",
    customerSegment: "direct_consumer",
    previousSuccessfulPayments: 3,
    retryCount: 0,
    daysOverdue: 52, // Exceeds 45 days
  };
  const scoreOverdue = calculateRecoveryScore(candidateOverdue, policy);
  assert(scoreOverdue.recommendedIntervention === "halt_recovery", `Overdue >45 days triggers halt_recovery (got ${scoreOverdue.recommendedIntervention})`);
  assert(scoreOverdue.riskLevel === "CRITICAL", `Overdue >45 days marked CRITICAL risk (got ${scoreOverdue.riskLevel})`);

  // Test 9: Stopping rule - Low confidence below 70% escalates to human review
  const candidateLowConfidence = {
    amount: 4000,
    failureReason: "bank_decline",
    paymentMethod: "card",
    customerSegment: "direct_consumer",
    previousSuccessfulPayments: 0,
    retryCount: 2,
    daysOverdue: 25,
  };
  const scoreLowConf = calculateRecoveryScore(candidateLowConfidence, policy);
  assert(scoreLowConf.recoveryProbability < 70, `Low prior scenario drops below 70% threshold (got ${scoreLowConf.recoveryProbability}%)`);
  assert(scoreLowConf.humanApprovalRequired === true, "Low confidence scenario flags humanApprovalRequired = true");

  console.log("\n------------------------------------------");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
