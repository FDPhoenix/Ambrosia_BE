const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: true },
  name: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, required: true },
  type: { type: String, required: true },
  status: { type: String, enum: ['Available', 'Unavailable'], required: true }
});

module.exports = mongoose.model('Ingredient', IngredientSchema);