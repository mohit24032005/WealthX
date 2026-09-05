const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  try {
    // Get Authorization Header
    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access Denied. No Token Provided.",
      });
    }

    // Extract Token
    const token = authHeader.split(" ")[1];

    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Store user id in request
    req.user = decoded;

    // Continue to next middleware/controller
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or Expired Token",
    });
  }
};

module.exports = authMiddleware;