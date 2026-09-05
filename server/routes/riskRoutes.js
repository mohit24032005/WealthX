const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getRiskDNA, submitRiskAssessment } = require("../controllers/riskController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getRiskDNA);
router.post("/", submitRiskAssessment);

module.exports = router;
