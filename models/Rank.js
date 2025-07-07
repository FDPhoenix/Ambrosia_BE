const mongoose = require("mongoose");

const rankSchema = new mongoose.Schema({
  rankName: { type: String, required: true },
  minSpending: { type: Number, required: true },
  benefits: { type: String },
});

const Rank = mongoose.model("Rank", rankSchema);
module.exports = Rank;
