const mongoose = require("mongoose");

const bookingDishSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish", required: true },
  quantity: { type: Number, required: true },
  priceAtTime: { type: Number}
});

const BookingDish = mongoose.model("BookingDish", bookingDishSchema);
module.exports = BookingDish;
