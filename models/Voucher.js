const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    discount: {
        type: Number,
        required: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    expiresAt: { 
        type: Date, 
        required: true 
    }
});

const Voucher = mongoose.model("Voucher", voucherSchema);
module.exports = Voucher;

