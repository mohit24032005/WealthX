const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getReconciliationStats,
  getReconciliationRecords,
  explainDiscrepancy,
  resolveDiscrepancy,
} = require("../controllers/reconciliationController");

router.use(authMiddleware);

router.get("/stats", getReconciliationStats);
router.get("/records", getReconciliationRecords);
router.post("/explain/:id", explainDiscrepancy);
router.post("/resolve/:id", resolveDiscrepancy);

module.exports = router;
