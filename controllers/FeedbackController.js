const Feedback = require('../models/Feedback');
const Order = require('../models/Order');
const Dish = require('../models/Dish');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require("mongoose");

exports.createFeedback = async (req, res) => {
    const { dish_id, rating, comment, orderId } = req.body;
    const userId = req.user.id;

    try {
        const dish = await Dish.findById(dish_id);
        if (!dish) {
            return res.status(400).json({
                message: 'Dish not found.',
                success: false,
            });
        }

        const newFeedback = new Feedback({
            userId,
            dish_id,
            orderId,
            rating,
            comment,
        });

        await newFeedback.save();

        return res.status(201).json({
            message: 'Feedback submitted successfully.',
            success: true,
            feedback: newFeedback,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal Server Error. Please try again later.',
            success: false,
        });
    }
};

exports.getFeedbackByDishId = async (req, res) => {
    try {
        const { dish_id } = req.params;
        const { rating } = req.query;
        let userRoleId = null;
        let decoded = null;

        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            try {
                decoded = jwt.verify(token, process.env.SECRET_KEY);
                const user = await User.findById(decoded.id);
                userRoleId = user ? user.roleId : null;
            } catch (error) {
                return res.status(401).json({
                    message: "Invalid token.",
                    success: false
                });
            }
        }

        const filter = { dish_id };

        if (!decoded || !decoded.roleId.includes("67ac64afe072694cafa16e76")) {
            filter.isHided = false;
        }

        if (rating) {
            filter.rating = Number(rating);
        }


        const dishIdObject = new mongoose.Types.ObjectId(dish_id);

        const statsFilter = {
            dish_id: dishIdObject,
            isHided: false
        };
        
        if (rating) {
            statsFilter.rating = Number(rating);
        }

        if (rating) {
            statsFilter.rating = Number(rating);
        }

        const feedbackStats = await Feedback.aggregate([
            { $match: statsFilter },
            {
                $group: {
                    _id: null,
                    totalFeedback: { $sum: 1 },
                    averageRating: { $avg: "$rating" }
                }
            }
        ]);

        const feedbacks = await Feedback.find(filter)
            .populate('userId', 'fullname email profileImage createdAt');

        if (!feedbacks || feedbacks.length === 0) {
            return res.status(404).json({
                message: "No feedback found for this dish.",
                success: false
            });
        }

        return res.status(200).json({
            message: "Feedbacks retrieved successfully.",
            success: true,
            feedbacks,
            totalFeedback: feedbackStats.length > 0 ? feedbackStats[0].totalFeedback : 0,
            averageRating: feedbackStats.length > 0
                ? Number(feedbackStats[0].averageRating.toFixed(1))
                : 0
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};

exports.updateFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const feedback = await Feedback.findById(id);

        if (!feedback) {
            return res.status(404).json({
                message: "Feedback not found.",
                success: false
            });
        }

        if (feedback.userId.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You are not authorized to update this feedback.",
                success: false
            });
        }

        feedback.rating = rating;
        feedback.comment = comment;
        await feedback.save();

        return res.status(200).json({
            message: "Feedback updated successfully.",
            success: true,
            feedback
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};

exports.deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback.findById(id);

        if (!feedback) {
            return res.status(404).json({
                message: "Feedback not found.",
                success: false
            });
        }

        if (feedback.userId.toString() !== req.user.id) {
            return res.status(403).json({
                message: "You are not authorized to delete this feedback.",
                success: false
            });
        }

        await Feedback.deleteOne({ _id: id });

        return res.status(200).json({
            message: "Feedback deleted successfully.",
            success: true
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};

exports.hideFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback.findById(id);

        if (!feedback) {
            return res.status(404).json({
                message: "Feedback not found.",
                success: false
            });
        }

        feedback.isHided = !feedback.isHided;
        await feedback.save();

        return res.status(200).json({
            message: `Feedback ${feedback.isHided ? "hidden" : "visible"} successfully.`,
            success: true,
            feedback
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};


exports.getAllFeedbackByDishIdAdmin = async (req, res) => {
    try {
        const { dish_id } = req.params;
        const { rating } = req.query;
        const filter = { dish_id };
        if (rating) {
            filter.rating = Number(rating);
        }
        const feedbacks = await Feedback.find(filter)
            .populate('userId', 'fullname email profileImage createdAt');
        if (!feedbacks || feedbacks.length === 0) {
            return res.status(404).json({
                message: "No feedback found for this dish.",
                success: false
            });
        }

        const statsFilter = { dish_id };
        if (rating) {
            statsFilter.rating = Number(rating);
        }
        const feedbackStats = await Feedback.aggregate([
            { $match: statsFilter },
            {
                $group: {
                    _id: null,
                    totalFeedback: { $sum: 1 },
                    averageRating: { $avg: "$rating" }
                }
            }
        ]);
        return res.status(200).json({
            message: "All feedbacks retrieved successfully.",
            success: true,
            feedbacks,
            totalFeedback: feedbackStats.length > 0 ? feedbackStats[0].totalFeedback : 0,
            averageRating: feedbackStats.length > 0
                ? Number(feedbackStats[0].averageRating.toFixed(1))
                : 0
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};


exports.getAllDishes = async (req, res) => {
    try {
        const { categoryId } = req.query;
        let filter = {};

        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            filter.categoryId = categoryId;
        }

        const dishes = await Dish.find(filter).populate("categoryId", "name");

        res.status(200).json(dishes);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách món ăn:", error);
        res.status(500).json({ message: "Lỗi khi lấy danh sách món ăn", error });
    }
};

exports.checkUserFeedback = async (req, res) => {
    try {
        const { dish_id, orderId } = req.params;
        const userId = req.user.id;

        const existingFeedback = await Feedback.findOne({
            userId: userId,
            dish_id: dish_id,
            orderId: orderId
        });

        return res.status(200).json({
            success: true,
            hasFeedback: !!existingFeedback,
            feedback: existingFeedback || null
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};
