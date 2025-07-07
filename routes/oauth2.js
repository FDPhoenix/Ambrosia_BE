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
  passport.authenticate("google", { failureRedirect: "/", session: false }),
  login2.googleCallback
);

router.get("/facebook", login2.facebookLogin);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/facebook/failure" }),
  login2.facebookCallback
);

router.get("/facebook/failure", login2.facebookLoginFailure);

module.exports = router;