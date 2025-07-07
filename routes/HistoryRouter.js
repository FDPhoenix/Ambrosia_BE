const express = require("express");
const HistoryController = require("../controllers/HistoryController");
const { isAuthenticated } = require('../middlewares/isAuthenticate');
const router = express.Router();


router.get("/bookings", isAuthenticated, HistoryController.getBookingHistory);
router.get("/booking/:id", isAuthenticated, HistoryController.getBookingDetails);


router.get("/orders", isAuthenticated, HistoryController.getOrderHistory);
router.get("/order/:id", isAuthenticated, HistoryController.getOrderDetails);


module.exports = router;
