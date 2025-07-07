const express = require("express");
const { getProfile, updateProfile, changePassword, uploadProfileImage, addUser, viewUser, banUser, getAllUsers, editUserInfo } = require("../controllers/UserController");
const { isAuthenticated } = require("../middlewares/isAuthenticate");
const upload = require("../middlewares/multer"); // Đảm bảo đúng đường dẫn file multer.js
const { getAllRanks } = require("../controllers/RankController");

const router = express.Router();

// Route để lấy thông tin hồ sơ người dùng
router.get("/profile", isAuthenticated, getProfile);

// Route để chỉnh sửa thông tin hồ sơ người dùng
router.put("/profile", isAuthenticated, updateProfile);

// Route để thay đổi mật khẩu
router.put("/change-password", isAuthenticated, changePassword);

router.post("/upload-profile-image", isAuthenticated, upload.single("image"), uploadProfileImage);

router.post("/add", addUser); // Thêm người dùng mới

router.get("/view/:userId", viewUser); // Xem chi tiết người dùng

router.put("/ban/:userId", banUser); // Ban/Unban người dùng

router.get("/all", getAllUsers);

router.put("/edit/:userId",upload.single('profileImage'), editUserInfo);

module.exports = router;
