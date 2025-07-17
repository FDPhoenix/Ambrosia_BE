const express = require("express");
const router = express.Router();
const { isAdmin, isAuthenticated } = require("../middlewares/isAuthenticate");
const { getAllCategories, createCategory, updateCategory, hideCategory, getAllCategoriesAdmin } = require("../controllers/CategoryController");

router.get("/all", getAllCategories);
router.get("/admin/all",isAuthenticated, isAdmin, getAllCategoriesAdmin);
router.post("/add", createCategory);
router.put("/update/:id", updateCategory);
router.patch("/hide/:id", hideCategory);

module.exports = router;