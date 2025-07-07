//routes/BookingRouter.js
const express = require("express");
const { createBooking, getBookingDetails, updateBooking, cancelBooking, confirmBooking, getAvailableTables, getDishes, addDishesToBooking,
    checkTableAvailability, updateNote } = require("../controllers/BookingController");
const { authenticate } = require("../middlewares/isAuthenticate");

const router = express.Router();

// 📌 API lấy danh sách bàn trống theo ngày & giờ
router.get("/available-tables", getAvailableTables);

// 📌 API kiểm tra bàn có thể đặt không
router.post("/check-table", checkTableAvailability);

// 📌 API lấy danh sách món ăn
router.get("/get-dishes", getDishes);

// API thêm món ăn vào đơn
router.put("/:bookingId/add-dishes", addDishesToBooking);

// API Đặt Bàn(Hỗ Trợ Đăng Nhập & Không Đăng Nhập)
router.post("/", createBooking);

//API Lấy Chi Tiết Đơn Hàng (Dùng để chỉnh sửa)
router.get("/:id", getBookingDetails);

// API Chỉnh Sửa Đơn Hàng
router.put("/:id", updateBooking);

//API Hủy Đơn Hàng
router.delete("/:id", cancelBooking);

//API Xác nhận hóa đơn điện tử
router.put("/:bookingId/confirm", confirmBooking);

router.put("/:bookingId/update-note", updateNote); // ✅ Chỉ giữ `/:bookingId/update-note`




module.exports = router;
