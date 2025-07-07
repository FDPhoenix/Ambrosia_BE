const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
  orderType: { type: String, required: true },
  bookingDate: { type: Date, required: true },
  startTime: { type: String },
  endTime: { type: String },
  status: { type: String, default: "pending" },
  notes: { type: String },
  pickupTime: { type: Date },
  contactPhone: { type: String },
  deliveryAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;
