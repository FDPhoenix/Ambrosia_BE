const BookingDish = require("../models/BookingDish");
const Dish = require("../models/Dish");

// Lấy danh sách món ăn bestseller
exports.getBestSellers = async (req, res) => {
  const { limit, month, year } = req.query;

  try {
    // Tạo điều kiện lọc theo tháng/năm nếu có
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1); // Bắt đầu từ ngày 1 của tháng
      const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Kết thúc vào ngày cuối tháng
      dateFilter = {
        "booking.createdAt": {
          $gte: startDate,
          $lte: endDate,
        },
      };
    }

    // Truy vấn tổng hợp từ BookingDish
    const bestSellers = await BookingDish.aggregate([
      // Join với Booking để lấy thông tin thời gian
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },
      // Áp dụng bộ lọc thời gian (nếu có)
      { $match: dateFilter },
      // Nhóm theo dishId và tính tổng quantity
      {
        $group: {
          _id: "$dishId",
          totalQuantity: { $sum: "$quantity" },
        },
      },
      // Sắp xếp theo totalQuantity giảm dần
      { $sort: { totalQuantity: -1 } },
      // Giới hạn số lượng kết quả
      { $limit: parseInt(limit) || 10 },
      // Join với Dish để lấy thông tin chi tiết
      {
        $lookup: {
          from: "dishes",
          localField: "_id",
          foreignField: "_id",
          as: "dishDetails",
        },
      },
      { $unwind: "$dishDetails" },
      // Định dạng dữ liệu đầu ra
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

    // Thông báo thời gian lọc (nếu có)
    const filterMessage = month && year
      ? `Danh sách món ăn bestseller trong tháng ${month}/${year}`
      : "Danh sách món ăn bestseller tổng quát";

    // Trả về kết quả
    res.status(200).json({
      success: true,
      message: filterMessage,
      data: bestSellers,
    });
  } catch (error) {
    console.error("🚨 Lỗi khi lấy danh sách bestseller:", error.message);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách bestseller!",
      error: error.message,
    });
  }
};

