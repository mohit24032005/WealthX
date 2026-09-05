const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { simulateFutureYou } = require("../controllers/simulationController");

const router = express.Router();

router.use(authMiddleware);

router.post("/future-you", simulateFutureYou);

module.exports = router;
