const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} = require("../controllers/goalController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getGoals);
router.post("/", createGoal);
router.put("/:id", updateGoal);
router.delete("/:id", deleteGoal);

module.exports = router;
