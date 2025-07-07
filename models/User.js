const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  rankId: { type: mongoose.Schema.Types.ObjectId, ref: "Rank" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  fullname: { type: String, required: true },
  phoneNumber: { type: String },
  profileImage: {
    type: String,
    default: "https://example.com/default-profile.png"
  },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  totalSpending: {type: Number, default: 0},
  otp: { type: String },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
