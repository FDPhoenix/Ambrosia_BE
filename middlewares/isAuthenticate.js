const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

exports.isAuthenticated = (req, res, next) => {
  try {
    let token = null;
    
    // Kiểm tra token từ header Authorization trước
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      token = authHeader.split(' ')[1];
      console.log("[AuthMiddleware] Token from Authorization header:", token ? "Found" : "Not found");
    }
    
    // Nếu không có token từ header, kiểm tra từ cookie
    if (!token) {
      token = req.cookies?.token;
      console.log("[AuthMiddleware] Token from cookie:", token ? "Found" : "Not found");
      console.log("[AuthMiddleware] All cookies:", req.cookies);
    }

    if (!token) {
      console.log("[AuthMiddleware] No token found in both header and cookie");
      return res.status(401).json({
        message: "Access denied. No token provided.",
        success: false
      });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        console.log("[AuthMiddleware] Token verification failed:", err.message);
        return res.status(401).json({
          message: "Invalid or expired token.",
          success: false
        });
      }

      console.log("[AuthMiddleware] Token verified successfully for user:", decoded.id);
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("[AuthMiddleware] Authentication error:", error);

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