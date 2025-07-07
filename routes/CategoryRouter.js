const express = require("express");
const router = express.Router();
// const { isAdmin } = require("../middlewares/isAuthenticate");
const { getAllCategories, createCategory, updateCategory, hideCategory } = require("../controllers/CategoryController");

router.get("/all", getAllCategories);
router.post("/add", createCategory);
router.put("/update/:id", updateCategory);
router.patch("/hide/:id", hideCategory);

module.exports = router;