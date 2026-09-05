/**
 * Automatic Demo Initialization & Deduplication Verification
 * Verifies Case 1 (Unauthenticated -> 401), Case 2 (judge.demo -> auto-seeded non-zero),
 * and Case 3 (Brand-new user -> auto-seeded non-zero, repeat request -> no duplicate records).
 */

const assert = (condition, msg) => {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
};

async function test() {
  const BASE = process.env.BASE_URL || "http://localhost:5000";
  console.log("\n=======================================================");
  console.log("TESTING AI REVENUE RECOVERY AUTOMATIC INITIALIZATION");
  console.log("=======================================================\n");

  // CASE 1: Unauthenticated request must return 401
  console.log("--- CASE 1: Unauthenticated Protection ---");
  const r1 = await fetch(BASE + "/api/recovery/stats");
  console.log("Unauthenticated /api/recovery/stats status:", r1.status);
  assert(r1.status === 401, "Unauthenticated request correctly rejected with HTTP 401");

  // CASE 2: judge.demo login & automatic demo dataset verification
  console.log("\n--- CASE 2: judge.demo Login & Dynamic Metrics ---");
  const r2 = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "judge.demo@wealthx.local", password: "Password@123" }),
  });
  const j2 = await r2.json();
  const token2 = j2.token;
  assert(Boolean(token2), "judge.demo login successful, received JWT");

  const s2 = await fetch(BASE + "/api/recovery/stats", {
    headers: { Authorization: "Bearer " + token2 },
  });
  const sj2 = await s2.json();
  const kpi2 = sj2.data?.kpis || {};
  console.log("judge.demo stats -> totalRecords:", kpi2.totalRecords, "revenueAtRisk: ₹" + kpi2.totalRevenueAtRisk?.toLocaleString("en-IN"), "recovered: ₹" + kpi2.recoveredRevenue?.toLocaleString("en-IN"));
  assert(kpi2.totalRecords > 0, `judge.demo has non-zero totalRecords (${kpi2.totalRecords})`);
  assert(kpi2.totalRevenueAtRisk > 0, `judge.demo has non-zero revenueAtRisk (₹${kpi2.totalRevenueAtRisk})`);

  // CASE 3: Brand-new user signup, login, auto-initialization & duplicate prevention
  console.log("\n--- CASE 3: Brand-New User Auto-Initialization & Deduplication ---");
  const email3 = "newjudge_" + Date.now() + "@wealthx.local";
  const pass3 = "Password@123";
  const r3 = await fetch(BASE + "/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "New Judge", email: email3, password: pass3 }),
  });
  const j3 = await r3.json();
  console.log("New user signup response status:", r3.status, j3.message);
  assert(r3.status === 201, "Brand-new user registered successfully (HTTP 201)");

  // Login as new user
  const l3 = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email3, password: pass3 }),
  });
  const lj3 = await l3.json();
  const token3 = lj3.token;
  assert(Boolean(token3), "Brand-new user login successful, received JWT");

  // First request: Must automatically initialize demo dataset
  console.log("\n1st request to /api/recovery/stats (triggers safe auto-initialization)...");
  const s3_1 = await fetch(BASE + "/api/recovery/stats", {
    headers: { Authorization: "Bearer " + token3 },
  });
  const sj3_1 = await s3_1.json();
  const kpi3_1 = sj3_1.data?.kpis || {};
  console.log("First request stats -> totalRecords:", kpi3_1.totalRecords, "revenueAtRisk: ₹" + kpi3_1.totalRevenueAtRisk?.toLocaleString("en-IN"));
  assert(kpi3_1.totalRecords > 0, `New user auto-initialized records: ${kpi3_1.totalRecords} records`);
  assert(kpi3_1.totalRevenueAtRisk > 0, `New user has non-zero revenue at risk: ₹${kpi3_1.totalRevenueAtRisk}`);

  // Second request: Must return identical records without duplicate seeding (120 -> 120, NOT 240)
  console.log("\n2nd request to /api/recovery/stats (verifying deduplication / no duplicate seeding)...");
  const s3_2 = await fetch(BASE + "/api/recovery/stats", {
    headers: { Authorization: "Bearer " + token3 },
  });
  const sj3_2 = await s3_2.json();
  const kpi3_2 = sj3_2.data?.kpis || {};
  console.log("Second request stats -> totalRecords:", kpi3_2.totalRecords, "revenueAtRisk: ₹" + kpi3_2.totalRevenueAtRisk?.toLocaleString("en-IN"));
  assert(kpi3_2.totalRecords === kpi3_1.totalRecords, `Deduplication verified: record count remained identical (${kpi3_2.totalRecords} === ${kpi3_1.totalRecords})`);
  assert(kpi3_2.totalRevenueAtRisk === kpi3_1.totalRevenueAtRisk, `Deduplication verified: revenueAtRisk remained identical (₹${kpi3_2.totalRevenueAtRisk})`);

  // Verify records list endpoint also loads correctly
  const recsRes = await fetch(BASE + "/api/recovery/records?page=1&limit=5", {
    headers: { Authorization: "Bearer " + token3 },
  });
  const recsJson = await recsRes.json();
  assert(recsRes.status === 200, "GET /api/recovery/records status is 200");
  assert(recsJson.data?.records?.length > 0, `GET /api/recovery/records returned ${recsJson.data?.records?.length} records`);

  console.log("\n=======================================================");
  console.log("ALL INITIALIZATION & DEDUPLICATION CHECKS PASSED!");
  console.log("=======================================================\n");
}

test().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
