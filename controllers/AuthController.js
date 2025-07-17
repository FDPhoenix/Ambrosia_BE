const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Rank = require("../models/Rank");
const { transporter } = require("../utils/mailConfig");
const UserRole = require("../models/UserRole");
const passport = require("passport");

exports.login2 = {
  googleCallback: async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not authenticated.",
        });
      }

      if (!user.rankId) {
        let defaultRank = await Rank.findOne({ rankName: "Bronze" });
        if (!defaultRank) {
          defaultRank = await Rank.create({
            rankName: "Bronze",
            minSpending: 0,
          });
        }
        user.rankId = defaultRank._id;
        await user.save();
      }
      if (!user.isActive) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=Your account is not verified or has been banned. Please verify your email or contact support.`);
      }


      const existingUserRole = await UserRole.findOne({ userId: user._id });
      if (!existingUserRole) {
        await UserRole.create({ userId: user._id, roleId: "67ac64bbe072694cafa16e78" });
      }

      const token = jwt.sign(
        {
          id: user._id,
          rankId: user.rankId,
          image: user.profileImage,
          fullname: user.fullname,
          roleId: ["67ac64bbe072694cafa16e78"],
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      const { password: _, ...userWithoutPassword } = user.toObject();

      let cookieOptions;
      if (process.env.NODE_ENV === "production") {
        cookieOptions = {
          httpOnly: false,
          secure: true,
          sameSite: 'none',
          maxAge: 1 * 24 * 60 * 60 * 1000,
          path: "/"
        };
      } else {
        cookieOptions = {
          httpOnly: false,
          secure: false,
          sameSite: 'lax',
          maxAge: 1 * 24 * 60 * 60 * 1000,
          path: "/"
        };
      }
      res.cookie("token", token, cookieOptions);
      res.redirect(`${process.env.FRONTEND_URL}/login?success=Welcome back, ${user.fullname}!&token=${token}`);
    } catch (error) {
       res.redirect(`${process.env.FRONTEND_URL}/login?error=Google login failed`);
    }
  },

  facebookLogin: passport.authenticate("facebook", { scope: ["email"] }),

  facebookCallback: async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not authenticated.",
        });
      }
      if (!user.isActive) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=Your account is not verified or has been banned. Please verify your email or contact support.`);
      }

      if (!user.rankId) {
        let defaultRank = await Rank.findOne({ rankName: "Bronze" });
        if (!defaultRank) {
          defaultRank = await Rank.create({
            rankName: "Bronze",
            minSpending: 0,
          });
        }
        user.rankId = defaultRank._id;
        await user.save();
      }


      const existingUserRole = await UserRole.findOne({ userId: user._id });
      if (!existingUserRole) {
        await UserRole.create({ userId: user._id, roleId: "67ac64bbe072694cafa16e78" });
      }

      const token = jwt.sign(
        {
          id: user._id,
          rankId: user.rankId,
          image: user.profileImage,
          fullname: user.fullname,
          roleId: ["67ac64bbe072694cafa16e78"],
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      const { password: _, ...userWithoutPassword } = user.toObject();

      res.cookie("token", token, {
        httpOnly: false,
        maxAge: 1 * 24 * 60 * 60 * 1000,
      });

      res.redirect(`${process.env.FRONTEND_URL}/login?success=Welcome back, ${user.fullname}!&token=${token}`);
    } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=Facebook login failed`);
    }
  },

  facebookLoginFailure: (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=Facebook login failed`);
  },
};

exports.register = async (req, res) => {
  const { fullname, email, password, phoneNumber } = req.body;

  try {
    if (!fullname || !email || !password || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (fullname.length > 50 || !/^[a-zA-ZÀ-ỹ]+( [a-zA-ZÀ-ỹ]+){0,2}$/.test(fullname)) {
      return res.status(400).json({
        success: false,
        message: "Full name must be up to 50 characters with at most 2 spaces.",
      });
    }

    if (email.length > 50 || /\s/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format or exceeds 50 characters.",
      });
    }

    if (!/^\d+$/.test(phoneNumber) || phoneNumber.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Phone number must contain only digits and not exceed 15 characters.",
      });
    }
    if (!/^0\d{9,10}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must start with 0 and contain 9 to 11 digits.",
      });
    }


    if (password.length > 50 || /\s/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must not exceed 50 characters or contain spaces.",
      });
    }

    const isExist = await User.findOne({ email });
    if (isExist) {
      if (!isExist.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account is banned. Cannot register.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let defaultRank = await Rank.findOne({ rankName: "Bronze" });
    if (!defaultRank) {
      defaultRank = await Rank.create({ rankName: "Bronze", minSpending: 0 });
    }

    const otp = generateRandomString();

    const newUser = await User.create({
      fullname,
      email,
      password: hashedPassword,
      phoneNumber,
      rankId: defaultRank._id,
      isActive: false,
      otp: otp,
    });

    const defaultRoleId = "67ac64bbe072694cafa16e78";

    const existingUserRole = await UserRole.findOne({
      userId: newUser._id,
      roleId: defaultRoleId
    });

    if (!existingUserRole) {
      await UserRole.create({ userId: newUser._id, roleId: defaultRoleId });
    }

    sendEmailOtp(fullname, email, otp);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email with the OTP sent.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
        success: false,
      });
    }

    const user = await User.findOne({ email }).populate("rankId");
    if (!user) {
      return res.status(404).json({
        message: "Invalid email or password.",
        success: false,
      });
    }

    // 🔒 Nếu user không có password (thường là social login)
    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google/Facebook login. Please login using that method or reset your password.",
        success: false,
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: "Invalid email or password.",
        success: false,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        code: 1001,
        message: "Your account is banned. Please contact support.",
        success: false,
      });
    }

    const userRoles = await UserRole.find({ userId: user._id }).populate("roleId");
    const roleIds = userRoles.map((ur) => ur.roleId._id);
    const roleNames = userRoles.map((ur) => ur.roleId.roleName);

    const token = jwt.sign(
      {
        id: user._id,
        rankId: user.rankId,
        image: user.profileImage,
        roleId: roleIds,
      },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    const { password: _, ...userWithoutPassword } = user.toObject();

    // Map roleName to redirect path
    let redirect = "/";
    if (roleNames.includes("admin")) {
      redirect = "/manage/dashboard";
    } else if (roleNames.includes("staff")) {
      redirect = "/staff";
    } else if (roleNames.includes("chef")) {
      redirect = "/chef";
    }

    return res
      .status(200)
      .cookie("token", token, {
        httpOnly: true,
        maxAge: 1 * 24 * 60 * 60 * 1000,
      })
      .json({
        message: `Welcome ${roleNames[0] || ""} ${user.fullname}!`,
        token,
        user: userWithoutPassword,
        redirect,
        success: true,
      });

  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error. Please try again later.",
      success: false,
    });
  }
};


exports.logout = async (req, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

function generateRandomString() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const sendEmailOtp = async (fullname, email, otp) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); background-color: #f9f9f9;">
      <h2 style="background-color: #007bff; color: white; padding: 15px; text-align: center; border-radius: 10px 10px 0 0; margin: 0;">
        ACCOUNT VERIFICATION
      </h2>
      <div style="padding: 20px; text-align: center;">
        <p style="font-size: 18px; color: #333;">Dear <strong>${fullname}</strong>,</p>
        <p style="font-size: 16px; color: #555;">You recently requested to verify your account. Use the OTP below to proceed:</p>
        <p style="font-size: 24px; font-weight: bold; color: #007bff; background: #eaf4ff; padding: 10px; display: inline-block; border-radius: 5px;">
          ${otp}
        </p>
        <p style="font-size: 14px; color: #777;">If you did not request this, please ignore this email or contact support.</p>
      </div>
    </div>`;
  await transporter.sendMail({
    from: "RESTAURANT MANAGEMENT SYSTEM <no-reply@restaurant.com>",
    to: email,
    subject: "OTP READY!",
    html: emailHtml,
  });
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    const now = new Date();
    const otpAge = (now - user.updatedAt) / 1000; // đơn vị: giây

    if (otpAge > 300) {
      return res.status(400).json({
        success: false,
        code: 1013,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 1012,
        message: "User not found.",
      });
    }


    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is banned or invalid.",
      });
    }
    

    user.isActive = true;
    user.otp = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      code: 1000,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email does not exist.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is banned. Cannot reset password.",
      });
    }
    

    const otp = generateRandomString();
    user.otp = otp;
    await user.save();

    sendEmailForgotOtp(user.fullname, user.email, otp);

    res.status(200).json({
      success: true,
      message: "OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Error during forgot password:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

const sendEmailForgotOtp = async (fullname, email, otp) => {
  const emailHtml = `
    <div style="font-family: 'Georgia', serif; background-color: #f5f2f0; max-width: 600px; margin: 20px auto; border-radius: 10px; border: 2px solid #d4af37; box-shadow: 0 8px 16px rgba(0,0,0,0.1); overflow: hidden;">
      <div style="background: linear-gradient(90deg, #d4af37, #b28c2e); color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; letter-spacing: 1px;">ACCOUNT VERIFICATION</h2>
      </div>
      <div style="padding: 20px;">
        <p style="font-size: 18px; color: #333; margin-bottom: 10px;">
          Dear <strong>${fullname}</strong>,
        </p>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          You recently requested to verify your account. Use the OTP below to proceed:
        </p>
        <div style="font-size: 24px; font-weight: bold; color: #d4af37; background: #faf8f3; border: 2px dashed #d4af37; padding: 15px; display: inline-block; border-radius: 5px; margin-bottom: 20px;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #777; margin-bottom: 0;">
          If you did not request this, please ignore this email or contact support.
        </p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: "RESTAURANT MANAGEMENT SYSTEM <no-reply@restaurant.com>",
    to: email,
    subject: "OTP READY!",
    html: emailHtml,
  });
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must not be the same as the old password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};