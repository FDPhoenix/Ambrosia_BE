const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
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

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "displayName", "email", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : `${profile.id}@facebook.com`;
        let user = await User.findOne({ facebookId: profile.id });

        if (!user) {
          let defaultRank = await Rank.findOne({ rankName: "Bronze" });
          if (!defaultRank) {
            defaultRank = await Rank.create({
              rankName: "Bronze",
              minSpending: 0,
            });
          }
          user = new User({
            facebookId: profile.id,
            fullname: profile.displayName,
            email,
            profileImage: profile.photos ? profile.photos[0].value : null,
            rankId: defaultRank._id,
            isActive: true,
          });
          try {
            await user.save();
          } catch (err) {
            if (err.code === 11000) {
              // Nếu lỗi duplicate email, tìm user bằng email
              user = await User.findOne({ email });
              if (!user.facebookId) {
                user.facebookId = profile.id;
                await user.save();
              }
            } else {
              throw err;
            }
          }
        }

        return done(null, user);
      } catch (error) {
        console.error("Error in Facebook Strategy:", error);
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
