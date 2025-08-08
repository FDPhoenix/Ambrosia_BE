const Dish = require('../models/Dish')
const cloudinary = require("../config/cloudinary");
const Category = require('../models/Category');
const Order = require('../models/Order');
const BookingDish = require('../models/BookingDish');

exports.searchByNameAndCategory = async (req, res) => {
    const { name, categoryId, priceRange } = req.query;
    let { page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;

    const skip = (page - 1) * limit;

    const filter = {};

    try {
        if (name) {
            filter.name = { $regex: name, $options: "i" };
        }

        if (categoryId) {
            filter.categoryId = categoryId;
        }

        if (priceRange) {
            const ranges = typeof priceRange === 'string' ? priceRange.split(',') : Array.isArray(priceRange) ? priceRange : [];

            const priceFilters = ranges.map((range) => {
                if (range === "below-100000") {
                    return { price: { $gte: 0, $lte: 99999 } };
                } else if (range === "above-1000000") {
                    return { price: { $gte: 1000000 } };
                } else {
                    const [min, max] = range.split('-').map(Number);
                    if (!isNaN(min) && !isNaN(max)) {
                        return { price: { $gte: min, $lte: max } };
                    }
                    return null;
                }
            }).filter(Boolean);

            if (priceFilters.length > 0) {
                filter.$or = priceFilters;
            }
        }

        const totalDishes = await Dish.countDocuments(filter);
        const dishes = await Dish.find(filter)
            .skip(skip)
            .limit(Number(limit));

        if (dishes.length === 0) {
            return res.status(404).json({
                message: "There are no dishes available",
                success: false,
            });
        }

        return res.status(200).json({
            message: "Finding dish successful",
            dishes,
            currentPage: Number(page),
            totalPages: Math.ceil(totalDishes / limit),
            success: true,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "An error occurred while fetching dishes.",
            success: false,
        });
    }
};

exports.listAllDish = async (req, res) => {
    try {
        let { page, limit } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 12;

        const skip = (page - 1) * limit;

        const allDish = await Dish.find({ isAvailable: true })
            .populate({ path: "categoryId", select: "name" })
            .select("_id name imageUrl description price")
            .skip(skip)
            .limit(limit);

        const dishes = allDish.map(dish => ({
            _id: dish._id,
            name: dish.name,
            imageUrl: dish.imageUrl,
            categoryName: dish.categoryId ? dish.categoryId.name : null,
            description: dish.description,
            price: dish.price,
        }));

        const totalDishes = await Dish.countDocuments({ isAvailable: true });
        const totalPages = Math.ceil(totalDishes / limit);

        return res.status(200).json({
            message: 'All dish will display',
            currentPage: page,
            totalPages,
            totalDishes,
            dishes,
            success: true,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "An error occurred while fetching dishes.",
            success: false
        });
    }
}

exports.getDish = async (req, res) => {
    try {
        const dishes = await Dish.find()
            .populate("categoryId", "name")
            .select("_id name imageUrl price isAvailable categoryId");

        const response = dishes.map(dish => ({
            _id: dish._id,
            name: dish.name,
            imageUrl: dish.imageUrl,
            categoryName: dish.categoryId.name,
            price: dish.price,
            isAvailable: dish.isAvailable
        }));

        res.status(200).json({
            message: 'Fetching dish successful',
            response,
            success: true
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};

exports.getDishDetail = async (req, res) => {
    const { id } = req.params;

    try {
        const dish = await Dish.findById(id).populate('categoryId', 'name');

        if (!dish) {
            return res.status(404).json({
                message: "Dish not found!",
                success: false
            });
        }

        const dishData = {
            _id: dish._id,
            name: dish.name,
            imageUrl: dish.imageUrl,
            categoryName: dish.categoryId ? dish.categoryId.name : 'Unknown Category',
            description: dish.description,
            price: dish.price,
            isAvailable: dish.isAvailable
        };

        res.status(200).json({
            message: 'Fetching dish successful',
            dish: dishData,
            success: true
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};

exports.getSuggestedDishes = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all orders for the user
        const orders = await Order.find({ userId, paymentStatus: "Success" }).select('bookingId');
        const bookingIds = orders.map(order => order.bookingId);

        // Find all dishes ordered by the user
        const bookedDishes = await BookingDish.find({ bookingId: { $in: bookingIds } })
            .populate('dishId')
            .lean();

        // Get unique dish IDs and their order frequency
        const dishFrequency = {};
        bookedDishes.forEach(({ dishId, quantity }) => {
            if (dishId) {
                dishFrequency[dishId._id] = (dishFrequency[dishId._id] || 0) + quantity;
            }
        });

        // Get categories of ordered dishes
        const orderedDishIds = Object.keys(dishFrequency);
        const orderedDishes = await Dish.find({ _id: { $in: orderedDishIds } })
            .select('categoryId')
            .lean();
        const categoryIds = [...new Set(orderedDishes.map(dish => dish.categoryId.toString()))];

        // Find dishes in the same categories, excluding already ordered dishes
        const recommendedDishes = await Dish.find({
            categoryId: { $in: categoryIds },
            _id: { $nin: orderedDishIds },
            isAvailable: true,
        })
            .populate('categoryId', 'name')
            .lean()
            .limit(8); // Limit to 8 recommendations

        // If no recommendations found, suggest popular dishes from other categories
        if (recommendedDishes.length === 0) {
            const popularDishes = await BookingDish.aggregate([
                {
                    $group: {
                        _id: '$dishId',
                        totalOrdered: { $sum: '$quantity' },
                    },
                },
                { $sort: { totalOrdered: -1 } },
                { $limit: 8 },
                {
                    $lookup: {
                        from: 'dishes',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'dish',
                    },
                },
                { $unwind: '$dish' },
                {
                    $match: {
                        'dish.isAvailable': true,
                        'dish._id': { $nin: orderedDishIds.map(id => mongoose.Types.ObjectId(id)) },
                    },
                },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'dish.categoryId',
                        foreignField: '_id',
                        as: 'dish.category',
                    },
                },
                { $unwind: '$dish.category' },
                {
                    $project: {
                        _id: '$dish._id',
                        name: '$dish.name',
                        price: '$dish.price',
                        imageUrl: '$dish.imageUrl',
                        description: '$dish.description',
                        category: '$dish.category.name',
                    },
                },
            ]);

            return res.status(200).json({
                success: true,
                message: 'Recommended popular dishes',
                data: popularDishes,
            });
        }

        // Format response
        const formattedRecommendations = recommendedDishes.map(dish => ({
            _id: dish._id,
            name: dish.name,
            price: dish.price,
            imageUrl: dish.imageUrl,
            description: dish.description,
            category: dish.categoryId.name,
        }));

        res.status(200).json({
            success: true,
            message: 'Dish recommendations retrieved successfully',
            data: formattedRecommendations,
        });
    } catch (error) {
        console.error('Error in getDishRecommendations:', error.message);

        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

exports.addDish = async (req, res) => {
    try {
        const { name, categoryId, price } = req.body;
        let imageUrl = "";

        if (!name || name.trim() === '') {
            return res.status(400).json({
                message: "Name cannot be blank or null",
                success: false
            });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({
                message: "Category not found",
                success: false
            });
        }

        if (!price || price < 1000) {
            return res.status(400).json({
                message: "Price cannot be null or lower than 1000",
                success: false
            });
        }

        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "restaurant_images" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                stream.end(req.file.buffer);
            });
            imageUrl = result.secure_url;
        } else {
            return res.status(400).json({
                message: "Image is required",
                success: false
            });
        }

        const newDish = new Dish({
            categoryId,
            name,
            description: "",
            price,
            isAvailable: true,
            imageUrl,
        });

        await newDish.save();
        res.status(201).json({
            message: "Dish added successfully",
            dish: newDish,
            success: true
        });
    } catch (error) {
        console.log(error)

        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};

exports.updateDish = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, categoryId, price } = req.body;
        let imageUrl;

        const dish = await Dish.findById(id);
        if (!dish) {
            return res.status(404).json({
                message: "Dish not found",
                success: false
            });
        }

        if (req.file) {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "restaurant_images" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });
            imageUrl = result.secure_url;
        }

        dish.categoryId = categoryId || dish.categoryId;
        dish.name = name || dish.name;
        dish.price = price || dish.price;
        if (imageUrl) dish.imageUrl = imageUrl;

        await dish.save();
        res.status(200).json({
            message: "Dish updated successfully",
            dish,
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

exports.updateDishStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isAvailable } = req.body;

        const dish = await Dish.findByIdAndUpdate(id, { isAvailable }, { new: true });

        if (!dish) {
            return res.status(404).json({
                message: "Dish not found",
                success: false
            });
        }

        res.status(200).json({
            message: "Dish status updated successfully",
            success: true
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};
