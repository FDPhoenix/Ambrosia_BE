const express = require('express');
const { searchByNameAndCategory, listAllDish, getDish, addDish, updateDishStatus, updateDish, getDishDetail, getSuggestedDishes } = require('../controllers/DishController');
const dishRouter = express.Router();
const multer = require("multer");
const { isAdmin, isAuthenticated } = require('../middlewares/isAuthenticate');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

dishRouter.get('/', searchByNameAndCategory);
dishRouter.get('/all', listAllDish);
dishRouter.get('/admin/all', isAuthenticated, isAdmin, getDish);
dishRouter.get('/detail/:id', getDishDetail);
dishRouter.get('/suggest',isAuthenticated, getSuggestedDishes);
dishRouter.post("/add", isAuthenticated, isAdmin, upload.single("image"), addDish);
dishRouter.put("/update/:id", isAuthenticated, isAdmin, upload.single("image"), isAdmin, updateDish);
dishRouter.patch("/hide/:id", isAuthenticated, isAdmin, updateDishStatus);

module.exports = dishRouter;

