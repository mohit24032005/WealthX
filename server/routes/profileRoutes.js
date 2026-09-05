const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getProfile, upsertProfile } = require("../controllers/profileController");

const router = express.Router();

// All profile routes require authentication
router.use(authMiddleware);

router.get("/", getProfile);
router.post("/", upsertProfile);
router.put("/", upsertProfile);

module.exports = router;
