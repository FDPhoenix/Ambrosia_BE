const express = require('express');
const { addToCart, getCartItem, deleteCartItem, updateQuantity, deleteMany } = require('../controllers/CartController');
const cartRouter = express.Router();

cartRouter.use(express.json());

cartRouter.post('/', addToCart);
cartRouter.get('/:userId', getCartItem);
cartRouter.put('/update', updateQuantity)
cartRouter.delete('/remove/:cartItemId', deleteCartItem);
cartRouter.delete('/remove/all/:userId', deleteMany)

module.exports = cartRouter;