const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const dns = require("dns");
try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignore
}

const createTransporter = () => {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || "teamaitvisioners@gmail.com").trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "vutxrdypsjnlysvi").trim().replace(/\s+/g, "");

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 12000,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Universal Email Dispatcher
 * Supports Google Apps Script Webhook (100% Free HTTPS), Resend, Brevo, and Nodemailer SMTP
 */
const sendUniversalEmail = async ({ to, subject, html, text }) => {
  // 1. Google Apps Script Webhook (100% Free, sends from Gmail to ANY email worldwide on Port 443)
  const googleWebhookUrl = process.env.GMAIL_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbzjEobbeYU9Xj7W2Ri8R3rQKv37Jy4kTcEzPSCH5Ail5PcUMhla3IPox8QippOGPRNq/exec";
  if (googleWebhookUrl) {
    try {
      console.log(`📧 Sending OTP via Google Apps Script HTTPS Webhook to: ${to}...`);
      const res = await fetch(googleWebhookUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        console.log(`✅ OTP email delivered via Google Apps Script Webhook to: ${to}!`);
        return { success: true, method: "google_webhook" };
      }
      throw new Error(data.error || "Google Webhook dispatch failed");
    } catch (err) {
      console.warn("⚠️ Google Webhook call failed, falling back to next provider:", err.message);
    }
  }

  // 2. Resend HTTPS API (Port 443)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`📧 Sending OTP via Resend HTTPS API (Port 443) to: ${to}...`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "WealthX Security <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
          text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || JSON.stringify(data));
      }
      console.log(`✅ OTP email sent via Resend HTTPS! Message ID: ${data.id}`);
      return { success: true, method: "resend", id: data.id };
    } catch (err) {
      console.warn("⚠️ Resend API call failed, falling back to SMTP:", err.message);
    }
  }

  // 2. Brevo HTTPS API (Port 443)
  if (process.env.BREVO_API_KEY) {
    try {
      console.log(`📧 Sending OTP via Brevo HTTPS API (Port 443) to: ${to}...`);
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "WealthX Security", email: process.env.SMTP_USER || "teamaitvisioners@gmail.com" },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || JSON.stringify(data));
      }
      console.log(`✅ OTP email sent via Brevo HTTPS! Message ID: ${data.messageId}`);
      return { success: true, method: "brevo", id: data.messageId };
    } catch (err) {
      console.warn("⚠️ Brevo API call failed, falling back to SMTP:", err.message);
    }
  }

  // 3. Standard Nodemailer SMTP
  const transporter = createTransporter();
  if (transporter) {
    console.log(`📧 Sending OTP via Gmail SMTP to: ${to}...`);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"WealthX Security" <${process.env.SMTP_USER || "teamaitvisioners@gmail.com"}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ OTP email sent via Gmail SMTP! Message ID: ${info.messageId}`);
    return { success: true, method: "smtp", id: info.messageId };
  }

  throw new Error("No active email transport configured.");
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter (A-Z)";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least 1 lowercase letter (a-z)";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least 1 number (0-9)";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return "Password must contain at least 1 special character (!@#$%^&*)";
  }
  return null;
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        isOnboarded: user.isOnboarded || false,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    // Get email and password from request
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare entered password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    // Check password
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role || "user",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // Send response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        isOnboarded: user.isOnboarded || false,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -resetOtp -resetOtpExpires");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        isOnboarded: user.isOnboarded || false,
        onboardingCompletedAt: user.onboardingCompletedAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    let isSandboxFallback = false;
    try {
      await sendUniversalEmail({
        to: user.email,
        subject: `🔒 ${otp} is your WealthX Password Reset Verification Code`,
        text: `Your WealthX password reset verification code is: ${otp}. This OTP will expire in 5 minutes. If you did not request this, please ignore this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0c1322; color: #f8fafc; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #38bdf8; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">WealthX Security</h2>
              <span style="font-size: 11px; font-weight: 700; color: #34d399; letter-spacing: 0.05em; text-transform: uppercase;">Password Reset Verification</span>
            </div>
            <p style="color: #cbd5e1; font-size: 14.5px; line-height: 1.5; margin: 0 0 16px 0;">
              Hello <strong>${user.name || "WealthX User"}</strong>,
            </p>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
              We received a request to reset the password for your WealthX account. Use the 6-digit verification code below to set a new password:
            </p>
            <div style="margin: 24px 0; padding: 18px; background: rgba(37,99,235,0.15); border: 1px solid rgba(59,130,246,0.35); border-radius: 8px; text-align: center;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; display: inline-block;">${otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 12.5px; line-height: 1.5; margin: 0 0 24px 0;">
              ⏳ This verification code expires in <strong>5 minutes</strong>. If you did not request this password reset, your account is safe and you can safely ignore this email.
            </p>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
            <p style="color: #64748b; font-size: 11px; margin: 0; text-align: center;">
              WealthX (VisionX) Platform • Advanced Financial Intelligence<br />
              Never share your OTP with anyone.
            </p>
          </div>
        `,
      });
    } catch (mailError) {
      console.warn("⚠️ Mail delivery notice:", mailError.message);
      if (
        mailError.message.includes("testing emails") ||
        mailError.message.includes("resend.dev") ||
        mailError.message.includes("verify a domain") ||
        mailError.message.includes("ENETUNREACH") ||
        mailError.message.includes("timeout") ||
        mailError.message.includes("ECONNREFUSED")
      ) {
        console.log(`🔒 [SANDBOX FALLBACK OTP]: ${otp} for ${user.email}`);
        isSandboxFallback = true;
      } else {
        return res.status(500).json({
          message: `Failed to send OTP email: ${mailError.message}`,
        });
      }
    }

    return res.status(200).json({
      message: isSandboxFallback
        ? `Resend Free Sandbox Notice: Real email delivery is restricted to your account owner (aneeshhegde33@gmail.com). For testing with ${user.email}, use code: ${otp}`
        : "OTP sent to your email. Please check your inbox.",
      sandboxOtp: isSandboxFallback ? otp : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (user.resetOtpExpires < Date.now()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    return res.status(200).json({
      message: "OTP verified",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        message: "Email, OTP, and password are required",
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const user = await User.findOne({ email });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (user.resetOtpExpires < Date.now()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
};