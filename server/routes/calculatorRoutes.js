const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  postSIP,
  postStepUpSIP,
  postEMI,
  postFD,
  postGoal,
} = require("../controllers/calculatorController");

const router = express.Router();

router.use(authMiddleware);

router.post("/sip", postSIP);
router.post("/step-up-sip", postStepUpSIP);
router.post("/emi", postEMI);
router.post("/fd", postFD);
router.post("/goal", postGoal);

module.exports = router;
