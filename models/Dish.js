const mongoose = require("mongoose");
const Category = require('./Category')

const dishSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: Category, required: true },
  name: { type: String, required: true },
  imageUrl: { type: String },
  description: { type: String },
  price: { type: Number, required: true },
  isAvailable: { type: Boolean, default: true },
});

const Dish = mongoose.model("Dish", dishSchema);
module.exports = Dish;
