const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.header("Authorization");
  if (!header) return res.status(401).json({ message: "Access denied" });

  // Accept both "Bearer <token>" and a raw token. The frontend historically
  // sent the raw JWT; new clients may send the standard Bearer scheme.
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Distinguish an expired access token so the client knows to refresh
    // rather than treating it as a hard auth failure.
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", expired: true });
    }
    res.status(400).json({ message: "Invalid token" });
  }
};
