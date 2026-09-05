const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getActionPlan } = require("../controllers/actionPlanController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getActionPlan);

module.exports = router;
