const express = require("express");
const { getOrders, getOrderById, updateOrderStatus } = require("../controllers/OrderController");

const router = express.Router();

router.get("/orders", getOrders);
router.get("/orders/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);

module.exports = router;
