const mongoose = require("mongoose");
const Cart = require('./Cart')
const Dish = require('./Dish')

const cartItemSchema = new mongoose.Schema({
  cartId: { type: mongoose.Schema.Types.ObjectId, ref: Cart, required: true },
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: Dish, required: true },
  quantity: { type: Number, required: true },
  notes: { type: String },
});

const CartItem = mongoose.model("CartItem", cartItemSchema);
module.exports = CartItem;
