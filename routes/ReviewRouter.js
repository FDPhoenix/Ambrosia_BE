const express = require("express");
const router = express.Router();
const { createReview, getAllReviews, replyToReview, filterReviews } = require("../controllers/ReviewController");

router.post("/create", createReview);
router.get("/", getAllReviews);
router.post("/reply", replyToReview);
router.get("/filter", filterReviews);

module.exports = router;
