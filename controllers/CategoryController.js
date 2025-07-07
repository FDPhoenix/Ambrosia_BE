const Category = require("../models/Category");
const Dish = require("../models/Dish");

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find(); // Get all categories

        return res.status(200).json({
            message: "Categories retrieved successfully.",
            success: true,
            categories
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Check if the category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({
                message: "Category already exists.",
                success: false
            });
        }

        const newCategory = new Category({ name, description });
        await newCategory.save();

        return res.status(201).json({
            message: "Category added successfully.",
            success: true,
            category: newCategory
        });
    } catch (error) {
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                message: "Category not found.",
                success: false
            });
        }

        if (name !== undefined) category.name = name;
        if (description !== undefined) category.description = description;

        await category.save();

        return res.status(200).json({
            message: "Category updated successfully.",
            success: true,
            category
        });
    } catch (error) {
        console.error("Error updating category:", error);
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};

exports.hideCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                message: "Category not found.",
                success: false
            });
        }

        if (!category.isHidden) {
            const dishesCount = await Dish.countDocuments({ categoryId: id });
            if (dishesCount > 0) {
                return res.status(400).json({
                    message: `There are ${dishesCount} dishes under this category.`,
                    success: false
                });
            }
        }

        category.isHidden = !category.isHidden;
        await category.save();

        return res.status(200).json({
            message: `Category has been successfully ${category.isHidden ? "hidden" : "shown"}.`,
            success: true,
            category
        });
    } catch (error) {
        console.error("Error hiding category:", error);
        return res.status(500).json({
            message: "Server error.",
            success: false
        });
    }
};
