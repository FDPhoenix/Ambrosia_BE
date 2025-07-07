const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    contactPhone: { type: String, required: true },
});

module.exports = mongoose.model("Guest", guestSchema);
