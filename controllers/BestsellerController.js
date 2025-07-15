const BookingDish = require("../models/BookingDish");
const Dish = require("../models/Dish");


exports.getBestSellers = async (req, res) => {
  const { limit, month, year } = req.query;

  try {

    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1); 
      const endDate = new Date(year, month, 0, 23, 59, 59, 999); 
      dateFilter = {
        "booking.createdAt": {
          $gte: startDate,
          $lte: endDate,
        },
      };
    } else if (year) {

      const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      dateFilter = {
        "booking.createdAt": {
          $gte: startDate,
          $lte: endDate,
        },
      };
    }

    const bestSellers = await BookingDish.aggregate([

      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },
      { $match: dateFilter },

      {
        $group: {
          _id: "$dishId",
          totalQuantity: { $sum: "$quantity" },
        },
      },

      { $sort: { totalQuantity: -1 } },

      { $limit: parseInt(limit) || 10 },

      {
        $lookup: {
          from: "dishes",
          localField: "_id",
          foreignField: "_id",
          as: "dishDetails",
        },
      },
      { $unwind: "$dishDetails" },

      {
        $project: {
          dishId: "$_id",
          name: "$dishDetails.name",
          imageUrl: "$dishDetails.imageUrl",
          description: "$dishDetails.description",
          price: "$dishDetails.price",
          totalQuantity: 1,
        },
      },
    ]);

 
    const filterMessage = month && year
      ? `List dishes in ${month}/${year}`
      : "List bestseller dishes";

    res.status(200).json({
      success: true,
      message: filterMessage,
      data: bestSellers,
    });
  } catch (error) {
    console.error("Error bestseller:", error.message);
    res.status(500).json({
      success: false,
      message: "Error bestseller!",
      error: error.message,
    });
  }
};

