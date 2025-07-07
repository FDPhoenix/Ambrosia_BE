const express = require('express');
const { getAllIngredients, addIngredient, updateIngredient, deleteIngredient, getIngredientByDishId, getIngredientsByType } = require('../controllers/IngredientController');
const router = express.Router();


router.get('/', getAllIngredients);
router.get('/:dishId', getIngredientByDishId);
router.post('/add', addIngredient);
router.put('/update/:ingredientId', updateIngredient);
router.patch('/hide/:ingredientId', deleteIngredient);
router.get('/filter/type', getIngredientsByType);

module.exports = router;