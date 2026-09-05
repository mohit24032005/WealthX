const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getRecoveryStats,
  getPaymentRecords,
  getPaymentRecordById,
  executeRecovery,
  runBatchCampaign,
  resetDemoData,
  getAuditLogs,
  simulateStrategy,
  getPolicy,
  updatePolicy,
} = require("../controllers/recoveryController");

// Protect all routes with existing JWT authMiddleware
router.use(authMiddleware);

router.get("/stats", getRecoveryStats);
router.get("/records", getPaymentRecords);
router.get("/records/:id", getPaymentRecordById);
router.post("/execute/:id", executeRecovery);
router.post("/batch-campaign", runBatchCampaign);
router.post("/reset-demo", resetDemoData);
router.get("/audit", getAuditLogs);
router.post("/simulate-strategy", simulateStrategy);
router.get("/policy", getPolicy);
router.put("/policy", updatePolicy);

module.exports = router;
