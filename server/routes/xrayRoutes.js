const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getFinancialXRay } = require("../controllers/xrayController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", getFinancialXRay);

module.exports = router;
