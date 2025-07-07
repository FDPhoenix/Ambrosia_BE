const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  totalAmount: { type: Number, required: true },
  prepaidAmount: { type: Number, default: 0 },
  paymentMethod: { type: String },
  paymentStatus: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
