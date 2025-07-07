// middleware/multer.js
const multer = require("multer");

const storage = multer.memoryStorage(); // Lưu trữ file trong bộ nhớ RAM
const upload = multer({ storage });

module.exports = upload;
