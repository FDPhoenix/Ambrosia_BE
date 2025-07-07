const Booking = require("../models/Booking");
const Table = require("../models/Table");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Dish = require("../models/Dish");
const BookingDish = require("../models/BookingDish");

exports.getBookingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const bookings = await Booking.find({ userId })
      .populate("tableId", "tableNumber capacity status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử đặt bàn",
      error: error.message,
    });
  }
};

exports.getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate("tableId", "tableNumber capacity status");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin đặt bàn!",
      });
    }

    const bookingDishes = await BookingDish.find({ bookingId: booking._id })
      .populate("dishId", "name price description");

    console.log("Chi tiết món ăn của booking: ", bookingDishes);

    res.status(200).json({
      success: true,
      data: {
        ...booking.toObject(),
        bookingDishes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết đặt bàn",
      error: error.message,
    });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId })
      .populate({
        path: "bookingId",
        select: "orderType bookingDate status",
        match: { orderType: "delivery" },
      })
      .sort({ createdAt: -1 });

    const filteredOrders = orders.filter(order => order.bookingId);

    const detailedOrders = await Promise.all(
      filteredOrders.map(async (order) => {
        const items = await BookingDish.find({ bookingId: order.bookingId._id })
          .populate("dishId", "name price imageUrl");
        return { ...order.toObject(), items };
      })
    );

    res.status(200).json({
      success: true,
      data: detailedOrders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error",
      error: error.message,
    });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate("bookingId", "orderType bookingDate status");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Not found!",
      });
    }

    const items = await BookingDish.find({ bookingId: order.bookingId._id })
      .populate("dishId", "name price imageUrl");

    res.status(200).json({
      success: true,
      data: { ...order.toObject(), items },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error get detail",
      error: error.message,
    });
  }
};