
const express = require('express');
const router = express.Router();
const { createFeedback, getFeedbackByDishId, updateFeedback, deleteFeedback, hideFeedback, getAllDishes } = require('../controllers/FeedbackController');
const { isAdmin, isAuthenticated } = require('../middlewares/isAuthenticate');

router.post('/add', isAuthenticated, createFeedback);
router.get('/dish/:dish_id', getFeedbackByDishId);
router.put('/update/:id', isAuthenticated, updateFeedback);
router.delete('/delete/:id', isAuthenticated, deleteFeedback);
router.patch("/hide/:id", hideFeedback);
router.get("/allDishes", getAllDishes);

module.exports = router;

