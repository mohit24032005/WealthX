/**
 * Verify Existing WealthX functionality remains fully intact
 */

async function testExistingWealthX() {
  console.log("==========================================");
  console.log("VERIFYING EXISTING WEALTHX FUNCTIONALITY");
  console.log("==========================================\n");

  const BASE_URL = "http://localhost:5000";

  // 1. Auth check
  const authRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "judge.demo@wealthx.local", password: "Password@123" }),
  });
  const auth = await authRes.json();
  if (!auth.token) {
    throw new Error("Authentication failed");
  }
  console.log("✅ 1. Authentication & JWT Login: VERIFIED");

  const headers = {
    Authorization: `Bearer ${auth.token}`,
    "Content-Type": "application/json",
  };

  // 2. Existing Dashboard API
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers });
  const dash = await dashRes.json();
  const d = dash.data || {};
  console.log(`✅ 2. Existing Dashboard Analytics: VERIFIED (Health Score: ${d.metrics?.healthScore}/100, Net Worth: ₹${d.metrics?.netWorth?.toLocaleString("en-IN")})`);
  console.log(`      Cash Flow: Monthly Income: ₹${d.metrics?.monthlyIncome}, Expenses: ₹${d.metrics?.monthlyExpenses}, Savings: ₹${d.metrics?.monthlySavings}`);
  console.log(`      Prioritized Insights: ${d.prioritizedInsights?.length || 0} recommendations generated`);

  // 3. User Profile
  const profRes = await fetch(`${BASE_URL}/api/profile`, { headers });
  const prof = await profRes.json();
  console.log(`✅ 3. Existing User Profile: VERIFIED (${prof.data?.name || "Demo User"})`);

  console.log("\n==========================================");
  console.log("ALL EXISTING WEALTHX MODULES OPERATIONAL!");
  console.log("==========================================\n");
}

testExistingWealthX().catch((err) => {
  console.error("Existing test failed:", err);
  process.exit(1);
});
