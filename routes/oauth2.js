const express = require("express");
const passport = require("passport");
const { login2 } = require("../controllers/AuthController");
const router = express.Router();

// Google Routes
router.get(
  "/login/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/login/oauth2/code/google",
  passport.authenticate("google", {
    failureRedirect: "/?error=Google%20authentication%20failed",
    session: false,
  }),
  (req, res, next) => {
    login2.googleCallback(req, res, next).catch((err) => {
      console.error("Google callback error:", err);
      res.redirect("/?error=An%20unexpected%20error%20occurred%20during%20Google%20authentication");
    });
  }
);

// Facebook Routes
router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
    session: false,
  })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/?error=Facebook%20authentication%20failed",
    session: false,
  }),
  (req, res, next) => {
    login2.facebookCallback(req, res, next).catch((err) => {
      console.error("Facebook callback error:", err);
      res.redirect("/?error=An%20unexpected%20error%20occurred%20during%20Facebook%20authentication");
    });
  }
);

// Facebook failure route
router.get("/facebook/failure", (req, res) => {
  res.redirect("/?error=Facebook%20authentication%20failed");
});

module.exports = router;