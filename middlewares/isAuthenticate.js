const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

exports.isAuthenticated = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
        success: false
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
        message: false
      });
    }


    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          message: "Invalid or expired token.",
          success: false
        });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      message: "Internal server error.",
      success: false
    });
  }
};

exports.isAdmin = (req, res, next) => {
  try {
    const user = req.user;

    if (!user || user.roleId != '67ac64afe072694cafa16e76') {
      return res.status(403).json({
        message: "Access denied. Admins only.",
        success: false,
      });
    }

    next();
  } catch (error) {
    console.error("Authorization error:", error);

    return res.status(500).json({
      message: "Internal server error.",
      success: false
    });
  }
}