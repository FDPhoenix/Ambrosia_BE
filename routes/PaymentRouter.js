const express = require("express");
const paymentController = require("../controllers/PaymentController");

const router = express.Router();

router.post("/checkout", paymentController.checkout);
router.post("/vnpay-create", paymentController.createPaymentUrl);
router.put("/update-status/:orderId", paymentController.updateOrderStatus);
router.post("/checkoutBooking", paymentController.checkoutBooking);
module.exports = router;