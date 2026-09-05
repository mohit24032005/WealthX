const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getSchemes } = require("../controllers/schemesController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getSchemes);

module.exports = router;
