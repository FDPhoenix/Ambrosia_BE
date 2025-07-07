const Cart = require('../models/Cart');
const CartItem = require("../models/CartItem");
const Dish = require("../models/Dish");

exports.addToCart = async (req, res) => {
    try {
        const { userId, dishId, quantity } = req.body;

        const dish = await Dish.findById(dishId);
        if (!dish) return res.status(404).json({
            message: "Dish not found",
            success: false
        });

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId });
            await cart.save();
        }

        let cartItem = await CartItem.findOne({ cartId: cart._id, dishId });
        if (cartItem) {
            cartItem.quantity += quantity;
        } else {
            cartItem = new CartItem({ cartId: cart._id, dishId, quantity });
        }

        await cartItem.save();

        res.status(200).json({
            message: "Item added to cart",
            cartItem,
            success: true
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
}

exports.getCartItem = async (req, res) => {
    try {
        const { userId } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({
            message: "Cart not found",
            success: false
        });

        const cartItems = await CartItem.find({ cartId: cart._id })
            .populate({
                path: "dishId",
                model: "Dish",
                populate: { path: "categoryId", model: "Category" },
            });

        const dishes = cartItems.map(item => ({
            _id: item._id,
            dishId: item.dishId._id,
            name: item.dishId.name,
            imageUrl: item.dishId.imageUrl,
            categoryName: item.dishId.categoryId.name,
            price: item.dishId.price,
            quantity: item.quantity,
        }));

        res.status(200).json({
            message: 'Fetch cart item successfully',
            dishes,
            success: true
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
}

exports.updateQuantity = async (req, res) => {
    try {
        const { cartItemId, action } = req.body;

        let cartItem = await CartItem.findById(cartItemId);
        if (!cartItem) return res.status(404).json({
            message: "CartItem not found",
            success: false
        });

        if (action === "increase") {
            cartItem.quantity += 1;
        } else if (action === "decrease" && cartItem.quantity > 1) {
            cartItem.quantity -= 1;
        }

        await cartItem.save();
        res.status(200).json({
            message: "Quantity updated",
            cartItem,
            success: true
        }); 
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
}

exports.deleteCartItem = async (req, res) => {
    try {
        const { cartItemId } = req.params;

        const cartItem = await CartItem.findByIdAndDelete(cartItemId);
        if (!cartItem) return res.status(404).json({
            message: "CartItem not found",
            success: false
        });

        res.status(200).json({ message: "Item removed from cart" });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
}

exports.deleteMany = async (req, res) => {
    try {
        const { userId } = req.params;

        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({
            message: "Cart not found",
            success: false
        });

        await CartItem.deleteMany({ cartId: cart._id });

        res.status(200).json({
            message: "Success",
            success: true
        });
    } catch (error) {
        console.log(error.message)

        res.status(500).json({
            message: 'Internal Server Error',
            success: false,
        });
    }
}
