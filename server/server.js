const dns = require("dns");
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignore in environments where not supported
}

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const assetRoutes = require("./routes/assetRoutes");
const goalRoutes = require("./routes/goalRoutes");
const xrayRoutes = require("./routes/xrayRoutes");
const actionPlanRoutes = require("./routes/actionPlanRoutes");
const investmentRoutes = require("./routes/investmentRoutes");
const calculatorRoutes = require("./routes/calculatorRoutes");
const loanRoutes = require("./routes/loanRoutes");
const riskRoutes = require("./routes/riskRoutes");
const decisionRoutes = require("./routes/decisionRoutes");
const nextMoneyRoutes = require("./routes/nextMoneyRoutes");
const simulationRoutes = require("./routes/simulationRoutes");
const hypeCheckRoutes = require("./routes/hypeCheckRoutes");
const schemesRoutes = require("./routes/schemesRoutes");
const historyRoutes = require("./routes/historyRoutes");
const mutualFundRoutes = require("./routes/mutualFundRoutes");
const investorQuestRoutes = require("./routes/investorQuestRoutes");
const recoveryRoutes = require("./routes/recoveryRoutes");
const reconciliationRoutes = require("./routes/reconciliationRoutes");
const copilotRoutes = require("./routes/copilotRoutes");

dotenv.config();

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/financial-xray", xrayRoutes);
app.use("/api/action-plan", actionPlanRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/calculators", calculatorRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/risk-dna", riskRoutes);
app.use("/api/decision-lab", decisionRoutes);
app.use("/api/next-money", nextMoneyRoutes);
app.use("/api/simulations", simulationRoutes);
app.use("/api/hype-check", hypeCheckRoutes);
app.use("/api/schemes", schemesRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/mutual-funds", mutualFundRoutes);
app.use("/api/investor-quest", investorQuestRoutes);
app.use("/api/recovery", recoveryRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/copilot", copilotRoutes);

app.get("/", (req, res) => {
  res.send("Backend is Running 🚀");
});

const PORT = parseInt(process.env.PORT, 10) || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on http://127.0.0.1:${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
});