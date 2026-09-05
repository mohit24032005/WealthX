const express = require("express");

const { signup, login, getMe, forgotPassword, verifyOtp, resetPassword } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

router.get("/dashboard", authMiddleware, (req, res) => {
  res.json({
    message: "Welcome to Dashboard",
    userId: req.user.id,
  });
});

module.exports = router;