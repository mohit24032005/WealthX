const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { analyzeHype, getTrendingTopics } = require("../controllers/hypeCheckController");

const router = express.Router();

router.use(authMiddleware);

router.post("/analyze", analyzeHype);
router.get("/trending", getTrendingTopics);

module.exports = router;
