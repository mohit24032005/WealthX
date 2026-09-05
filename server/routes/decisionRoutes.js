const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { evaluateFinancialDecision, getPresetQuestions } = require("../controllers/decisionController");

const router = express.Router();

router.use(authMiddleware);

router.post("/evaluate", evaluateFinancialDecision);
router.get("/preset-questions", getPresetQuestions);

module.exports = router;
