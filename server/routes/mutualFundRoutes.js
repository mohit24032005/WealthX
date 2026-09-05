const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { searchFunds, getFundDetails } = require("../controllers/mutualFundController");

router.use(authMiddleware);

router.get("/search", searchFunds);
router.get("/:code", getFundDetails);

module.exports = router;
