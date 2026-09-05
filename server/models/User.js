const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  resetOtp: {
    type: String,
    default: null,
  },

  resetOtpExpires: {
    type: Date,
    default: null,
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  isOnboarded: {
    type: Boolean,
    default: false,
  },

  onboardingCompletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const User = mongoose.model("User", userSchema);

module.exports = User;