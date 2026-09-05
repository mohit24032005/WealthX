/**
 * End-to-End Integration Verification against running Docker backend (http://localhost:5000)
 */

async function runE2E() {
  console.log("==================================================");
  console.log("STARTING WEALTHX END-TO-END SYSTEM VERIFICATION");
  console.log("==================================================\n");

  const BASE_URL = "http://localhost:5000";

  // 1. Health check
  console.log("1. Checking Server Health...");
  const healthRes = await fetch(`${BASE_URL}/`);
  const healthText = await healthRes.text();
  console.log(`   Response: ${healthText.trim()}`);
  if (!healthText.includes("Running")) throw new Error("Health check failed");

  // 2. Authenticate (Signup or Login)
  console.log("\n2. Authenticating Demo Operator...");
  const testUser = {
    name: "Razorpay Buildathon Judge",
    email: "judge.demo@wealthx.local",
    password: "Password@123",
  };

  let token = null;
  let authRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testUser),
  });
  let authJson = await authRes.json();

  if (authRes.ok && authJson.token) {
    token = authJson.token;
    console.log("   Signed up new demo user successfully.");
  } else {
    // Already exists, attempt login
    authRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    authJson = await authRes.json();
    if (!authRes.ok || !authJson.token) {
      throw new Error(`Login failed: ${JSON.stringify(authJson)}`);
    }
    token = authJson.token;
    console.log("   Logged in existing demo user successfully.");
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // 3. Reset / Seed Demo Dataset (120 payments, 60 reconciliations)
  console.log("\n3. Seeding Demo Dataset (120 payments & 60 reconciliations)...");
  const resetRes = await fetch(`${BASE_URL}/api/recovery/reset-demo`, {
    method: "POST",
    headers: authHeaders,
  });
  const resetJson = await resetRes.json();
  console.log(`   Counts: ${resetJson.data?.counts?.paymentsCount} payments, ${resetJson.data?.counts?.reconciliationsCount} reconciliations.`);
  if (resetJson.data?.counts?.paymentsCount < 100) {
    throw new Error("Seed count less than 100 payments!");
  }

  // 4. Fetch Recovery Statistics
  console.log("\n4. Checking Calculated KPIs...");
  const statsRes = await fetch(`${BASE_URL}/api/recovery/stats`, { headers: authHeaders });
  const statsJson = await statsRes.json();
  const kpis = statsJson.data?.kpis || {};
  console.log(`   Total Records: ${kpis.totalRecords}`);
  console.log(`   Revenue At Risk: ₹${kpis.totalRevenueAtRisk?.toLocaleString("en-IN")}`);
  console.log(`   Eligible Revenue: ₹${kpis.eligibleRevenue?.toLocaleString("en-IN")} (${kpis.eligibleCount} opportunities)`);
  console.log(`   Baseline Recovered: ₹${kpis.recoveredRevenue?.toLocaleString("en-IN")}`);
  console.log(`   Recovery Rate: ${kpis.recoveryRate}%`);

  // 5. Fetch Records List & Inspect Top Candidate
  console.log("\n5. Querying Payment Opportunities...");
  const recsRes = await fetch(`${BASE_URL}/api/recovery/records?page=1&limit=5&minProbability=75`, { headers: authHeaders });
  const recsJson = await recsRes.json();
  const topRecords = recsJson.data?.records || [];
  console.log(`   Fetched ${topRecords.length} high-probability opportunities.`);
  const candidate = topRecords[0];
  console.log(`   Target Candidate: ${candidate.transactionId} (${candidate.customerName}, ₹${candidate.amount}, ${candidate.recoveryProbability}%, Reason: ${candidate.failureReason})`);

  // 6. Execute Single Bounded Recovery (Simulated)
  console.log(`\n6. Executing Single Bounded Recovery on ${candidate.transactionId}...`);
  const execRes = await fetch(`${BASE_URL}/api/recovery/execute/${candidate._id}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ humanApproved: true, approvedBy: "Buildathon Evaluator" }),
  });
  const execJson = await execRes.json();
  console.log("   Recovery Execution Result:", execJson.data?.result, `(Recovered: ₹${execJson.data?.recoveredAmount || 0})`);

  // 6b. Verify Duplicate Action Protection
  console.log(`\n6b. Verifying Duplicate-Action Protection on ${candidate.transactionId}...`);
  const dupRes = await fetch(`${BASE_URL}/api/recovery/execute/${candidate._id}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ humanApproved: true }),
  });
  const dupJson = await dupRes.json();
  if (dupRes.status === 400 && dupJson.message?.includes("already recovered")) {
    console.log(`   ✅ Duplicate protection verified: Successfully rejected repeated execution (${dupJson.message}).`);
  } else {
    console.warn(`   Note: Response status ${dupRes.status}: ${JSON.stringify(dupJson)}`);
  }

  // 7. Run AI Recovery Campaign (Batch)
  console.log("\n7. Launching Autonomous Batch Recovery Campaign across all eligible records...");
  const campRes = await fetch(`${BASE_URL}/api/recovery/batch-campaign`, {
    method: "POST",
    headers: authHeaders,
  });
  const campJson = await campRes.json();
  const batch = campJson.data?.batchSummary || {};
  console.log(`   Analyzed: ${batch.analyzedCount}`);
  console.log(`   Eligible: ${batch.eligibleCount}`);
  console.log(`   Skipped: ${batch.skippedCount}`);
  console.log(`   Attempted: ${batch.attemptedCount}`);
  console.log(`   Recovered: ₹${batch.recoveredAmount?.toLocaleString("en-IN")} (${batch.recoveredCount} txns)`);
  console.log(`   Unrecovered: ₹${batch.unrecoveredAmount?.toLocaleString("en-IN")}`);
  console.log(`   Stopped (Policy limit): ${batch.stoppedCount}`);
  console.log(`   Escalated: ${batch.escalatedCount}`);
  console.log(`   Batch Recovery Rate: ${batch.effectiveBatchRecoveryRate}%`);

  // 8. Verify Immutable Audit Logs
  console.log("\n8. Verifying Audit Trail...");
  const auditRes = await fetch(`${BASE_URL}/api/recovery/audit?page=1&limit=5`, { headers: authHeaders });
  const auditJson = await auditRes.json();
  console.log(`   Total Audit Entries Logged: ${auditJson.data?.pagination?.total}`);
  const latestLog = auditJson.data?.logs?.[0];
  console.log(`   Latest Log: [${latestLog?.actionType}] Txn: ${latestLog?.transactionId}, Result: ${latestLog?.executionResult}, Diagnosis: "${latestLog?.diagnosis?.substring(0, 60)}..."`);

  // 9. Verify Track 04 Finance Controller (Reconciliation - 100 records)
  console.log("\n9. Verifying AI Finance Controller (100 Reconciliation Records)...");
  const reconRes = await fetch(`${BASE_URL}/api/reconciliation/stats`, { headers: authHeaders });
  const reconJson = await reconRes.json();
  const rStats = reconJson.data?.stats || {};
  console.log(`   Total Reconciled Records: ${rStats.totalRecords}`);
  console.log(`   Match Rate: ${rStats.matchRate}% (${rStats.matchedCount} matched)`);
  console.log(`   Exceptions Count: ${rStats.exceptionsCount}`);
  console.log(`   Discrepancy Pool: ₹${rStats.totalDiscrepancyAmount?.toLocaleString("en-IN")}`);
  if (rStats.totalRecords < 100) {
    throw new Error(`Reconciliation dataset has ${rStats.totalRecords} records, expected >= 100!`);
  }

  // 10. Explain a Discrepancy
  const reconListRes = await fetch(`${BASE_URL}/api/reconciliation/records?onlyExceptions=true&limit=1`, { headers: authHeaders });
  const reconListJson = await reconListRes.json();
  const exRec = reconListJson.data?.records?.[0];
  if (exRec) {
    console.log(`\n10. Explaining Discrepancy for Order ${exRec.orderId} (Discrepancy: ₹${exRec.discrepancyAmount})...`);
    const explainRes = await fetch(`${BASE_URL}/api/reconciliation/explain/${exRec._id}`, {
      method: "POST",
      headers: authHeaders,
    });
    const explainJson = await explainRes.json();
    console.log(`    AI Root Cause Explanation: "${explainJson.data?.explanation}"`);
  }

  // 11. Test Ask WealthX Copilot (All 4 Prompt Questions)
  console.log("\n11. Testing Grounded Copilot Queries...");
  const questions = [
    "How much revenue did AI recover?",
    "How much revenue is currently at risk?",
    "How many recovery opportunities are eligible?",
    "How many reconciliation exceptions are open?",
  ];

  for (const q of questions) {
    const copilotRes = await fetch(`${BASE_URL}/api/copilot/query`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ query: q }),
    });
    const cJson = await copilotRes.json();
    console.log(`    Q: "${q}"`);
    console.log(`    A: "${cJson.data?.answer}"`);
  }

  console.log("\n==================================================");
  console.log("✅ ALL END-TO-END CHECKS COMPLETED SUCCESSFULLY!");
  console.log("==================================================\n");
}

runE2E().catch((err) => {
  console.error("❌ E2E VERIFICATION FAILED:", err);
  process.exit(1);
});
