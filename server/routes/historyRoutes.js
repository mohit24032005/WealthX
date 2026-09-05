const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getFinancialHistory } = require("../controllers/historyController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getFinancialHistory);

module.exports = router;
