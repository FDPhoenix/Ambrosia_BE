const News = require("../models/News");
const upload2 = require("../middlewares/multer"); // Đảm bảo đúng đường dẫn file multer.js
const cloudinary = require("../config/cloudinary");

// Get all news (chỉ lấy bài viết đã published)
exports.getAllNews = async (req, res) => {
    try {
        // Chỉ lấy bài viết có isPublished = true
        const news = await News.find({ isPublished: true });
        res.status(200).json({ success: true, news });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching news", error });
    }
};

// Add news
exports.addNews = async (req, res) => {
    try {
        // Lấy isPublished từ req.body (dưới dạng string)
        // Nếu isPublished === "true" => true, ngược lại => false
        const { title, content, category, isPublished } = req.body;
        const isPublishedBoolean = isPublished === "true";

        if (!req.file) {
            return res.status(400).json({ message: "No image file provided", success: false });
        }

        // Upload hình lên Cloudinary
        cloudinary.uploader.upload_stream(
            { folder: "restaurant_images" },
            async (error, result) => {
                if (error) {
                    console.error("Cloudinary Error:", error);
                    return res.status(500).json({ message: "Upload failed", success: false, error });
                }

                const newNews = new News({
                    title,
                    content,
                    category,
                    imageUrl: result.secure_url,
                    author: "Admin",
                    isPublished: isPublishedBoolean, // Sử dụng biến boolean
                });

                await newNews.save();
                res.status(201).json({ success: true, message: "News added successfully", news: newNews });
            }
        ).end(req.file.buffer);
    } catch (error) {
        console.error("Error adding news:", error);
        res.status(500).json({ success: false, message: "Error adding news", error });
    }
};

// Update news function
exports.updateNews = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category, author, isPublished } = req.body;

        // Ép kiểu isPublished sang boolean
        const isPublishedBoolean = isPublished === "true";

        // Tìm bài viết cần cập nhật
        const existingNews = await News.findById(id);
        if (!existingNews) {
            return res.status(404).json({ success: false, message: "News not found" });
        }

        // Tạo object chứa dữ liệu cần cập nhật
        const updateData = {
            title,
            content,
            category,
            author,
            isPublished: isPublishedBoolean, // Lưu dạng boolean
            updatedAt: Date.now(),
        };

        // Nếu có ảnh mới, tải lên Cloudinary và cập nhật imageUrl
        if (req.file) {
            cloudinary.uploader.upload_stream(
                { folder: "restaurant_images" },
                async (error, result) => {
                    if (error) {
                        console.error("Cloudinary Upload Error:", error);
                        return res.status(500).json({ success: false, message: "Image upload failed", error });
                    }

                    updateData.imageUrl = result.secure_url;

                    // Cập nhật bài viết với ảnh mới
                    const updatedNews = await News.findByIdAndUpdate(id, updateData, { new: true });
                    res.status(200).json({ success: true, message: "News updated successfully", news: updatedNews });
                }
            ).end(req.file.buffer);
        } else {
            // Nếu không có ảnh mới, chỉ cập nhật thông tin khác
            const updatedNews = await News.findByIdAndUpdate(id, updateData, { new: true });
            res.status(200).json({ success: true, message: "News updated successfully", news: updatedNews });
        }
    } catch (error) {
        console.error("Error updating news:", error);
        res.status(500).json({ success: false, message: "Error updating news", error });
    }
};

// Delete news
exports.deleteNews = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedNews = await News.findByIdAndDelete(id);

        if (!deletedNews) {
            return res.status(404).json({ success: false, message: "News not found" });
        }

        res.status(200).json({ success: true, message: "News deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting news", error });
    }
};

// Get news by ID (Xem chi tiết bài viết)
exports.getNewsById = async (req, res) => {
    try {
        const { id } = req.params;
        const newsItem = await News.findById(id);

        if (!newsItem) {
            return res.status(404).json({ success: false, message: "News not found" });
        }

        res.status(200).json({ success: true, news: newsItem });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching news", error });
    }
};

exports.getFilter = async (req, res) => {
    try {
        const { category } = req.query;

        // Chỉ lấy các bài viết có isPublished = true
        const query = { isPublished: true };

        if (category) {
            query.category = category;
        }

        const news = await News.find(query);
        res.status(200).json({ success: true, news });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching news", error });
    }
};

exports.getFilterAdmins = async (req, res) => {
    try {
        const { category } = req.query;

        // Chỉ lấy các bài viết có isPublished = true
        const query = {};

        if (category) {
            query.category = category;
        }

        const news = await News.find(query);
        res.status(200).json({ success: true, news });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching news", error });
    }
};
