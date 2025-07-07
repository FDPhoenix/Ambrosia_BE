const express = require("express");
const router = express.Router();
const upload = require("../middlewares/multer"); // Đảm bảo đúng đường dẫn file multer.js

const newsController = require("../controllers/NewsController");


// Lấy tất cả bài viết hoặc lọc bài viết theo danh mục
router.get("/", newsController.getFilter);

router.get("/all", newsController.getFilterAdmins);

// Lấy bài viết chi tiết theo ID
router.get("/:id", newsController.getNewsById);

// Thêm bài viết mới
router.post("/", upload.single("image"), newsController.addNews);

// Cập nhật bài viết
router.put("/:id", upload.single("image"), newsController.updateNews);

// Xóa bài viết
router.delete("/:id", newsController.deleteNews);

module.exports = router;
