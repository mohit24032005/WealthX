const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { queryCopilot } = require("../controllers/copilotController");

router.use(authMiddleware);

router.post("/query", queryCopilot);

module.exports = router;
