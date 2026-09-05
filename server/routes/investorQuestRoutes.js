const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const {
  getInitialConfig,
  startSimulation,
  processTurnAction,
  askMentor,
  getWhatIfAnalysis,
} = require("../controllers/investorQuestController");

// Optional Auth Middleware: Populate req.user if valid token provided, but never block simulation
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }
    }
  } catch (err) {
    // Ignore token verification errors and proceed with guest state
  }
  next();
};

router.get("/config", optionalAuth, getInitialConfig);
router.post("/start", optionalAuth, startSimulation);
router.post("/turn", optionalAuth, processTurnAction);
router.post("/ask-mentor", optionalAuth, askMentor);
router.post("/what-if", optionalAuth, getWhatIfAnalysis);

module.exports = router;
