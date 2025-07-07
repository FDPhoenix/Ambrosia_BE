const express = require("express");
const { addStaff, addChef, getStaff, getChef, updateEmployee, getEmployeeById, deleteEmployee, verifyBookingByStaff } = require("../controllers/EmployeeController");
const router = express.Router();


// API thêm nhân viên
router.post("/addStaff", addStaff);
router.post("/addChef", addChef);

// API lấy danh sách nhân viên
router.get("/getStaff", getStaff);
router.get("/getChef", getChef);

// API cập nhật nhân viên
router.put("/update/:id", updateEmployee);
router.get("/getEmployee/:id", getEmployeeById)

// Xóa tài khoản nhân viên vĩnh viễn
router.delete("/delete/:id", deleteEmployee);
router.get("/verify-booking/:bookingId", verifyBookingByStaff);


module.exports = router;
