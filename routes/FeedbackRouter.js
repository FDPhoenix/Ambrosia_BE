
const express = require('express');
const router = express.Router();
const { createFeedback, getFeedbackByDishId, updateFeedback, deleteFeedback, hideFeedback, getAllDishes, getAllFeedbackByDishIdAdmin } = require('../controllers/FeedbackController');
const { isAdmin, isAuthenticated } = require('../middlewares/isAuthenticate');

router.post('/add', isAuthenticated, createFeedback);
router.get('/dish/:dish_id', getFeedbackByDishId);
router.get('/admin/dish/:dish_id', isAuthenticated, isAdmin, getAllFeedbackByDishIdAdmin);
router.put('/update/:id', isAuthenticated, updateFeedback);
router.delete('/delete/:id', isAuthenticated, deleteFeedback);
router.patch("/hide/:id", hideFeedback);
router.get("/allDishes", getAllDishes);

module.exports = router;

