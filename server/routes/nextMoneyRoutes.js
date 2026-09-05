const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { allocateNextMoney } = require("../controllers/nextMoneyController");

const router = express.Router();

router.use(authMiddleware);

router.post("/allocate", allocateNextMoney);

module.exports = router;
