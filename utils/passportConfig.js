const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const Rank = require("../models/Rank");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        console.log(profile);
        let user = await User.findOne({ email });

        if (!user) {
          let defaultRank = await Rank.findOne({ rankName: "Bronze" });
          if (!defaultRank) {
            // Nếu Rank mặc định không tồn tại, tạo một Rank mới
            defaultRank = await Rank.create({
              rankName: "Bronze",
              minSpending: 0,
            });
          }
          user = new User({
            email,
            fullname: profile.displayName,
            isActive: true,
            rankId: defaultRank._id,
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
