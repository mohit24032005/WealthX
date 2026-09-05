const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  simulateRepayment,
} = require("../controllers/loanController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getLoans);
router.post("/", createLoan);
router.post("/simulate-repayment", simulateRepayment);
router.put("/:id", updateLoan);
router.delete("/:id", deleteLoan);

module.exports = router;
