const Order = require("../models/Order");
const Booking = require("../models/Booking");
const Guest = require("../models/Guest");

exports.getOrders = async (req, res) => {
    try {
        const { userId, paymentStatus, page = 1, limit = 6, orderType, dateRange, fromDate, toDate } = req.query;
        const filter = {};

        if (userId) filter.userId = userId;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        let bookingFilter = {};
        if (orderType) bookingFilter.orderType = orderType;

        if (dateRange || fromDate || toDate) {
            bookingFilter.bookingDate = {};
            const now = new Date();
            let startDate, endDate;
            if (dateRange) {
                switch (dateRange) {
                    case "today":
                        startDate = new Date(); startDate.setHours(0, 0, 0, 0);
                        endDate = new Date(); endDate.setHours(23, 59, 59, 999);
                        break;
                    case "yesterday":
                        startDate = new Date(); startDate.setDate(startDate.getDate() - 1); startDate.setHours(0, 0, 0, 0);
                        endDate = new Date(startDate); endDate.setHours(23, 59, 59, 999);
                        break;
                    case "last7days":
                        endDate = new Date(); endDate.setHours(23, 59, 59, 999);
                        startDate = new Date(); startDate.setDate(startDate.getDate() - 6); startDate.setHours(0, 0, 0, 0);
                        break;
                    case "thisMonth":
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                        break;
                    case "lastMonth":
                        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                        break;
                }
                if (startDate) bookingFilter.bookingDate.$gte = startDate;
                if (endDate) bookingFilter.bookingDate.$lte = endDate;
            }
            if (fromDate) bookingFilter.bookingDate.$gte = new Date(fromDate);
            if (toDate) bookingFilter.bookingDate.$lte = new Date(toDate);
        }

        const allOrders = await Order.find(filter)
            .populate({ path: "userId", select: "fullname email phoneNumber" })
            .populate({
                path: "bookingId",
                match: Object.keys(bookingFilter).length > 0 ? bookingFilter : undefined,
                populate: [
                    { path: "tableId", select: "tableNumber capacity" },
                    { path: "userId", select: "fullname email phoneNumber" }
                ]
            })
            .sort({ createdAt: -1 });

        let filteredOrders = allOrders;
        if (Object.keys(bookingFilter).length > 0) {
            filteredOrders = allOrders.filter(order => order.bookingId);
        }

        const bookingIds = filteredOrders
            .map(order => order.bookingId?._id)
            .filter(id => id);
        const guests = await Guest.find({ bookingId: { $in: bookingIds } }).lean();

        const formattedOrders = filteredOrders.map(order => {
            const booking = order.bookingId;
            const guest = guests.find(g => g.bookingId.toString() === booking?._id.toString());

            const isDineIn = booking?.orderType === "dine-in";

            return {
                ...order.toObject(),
                orderType: isDineIn ? "dine-in" : "delivery",
                bookingInfo: booking ? {
                    bookingDate: booking.bookingDate,
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                    table: booking.tableId?.tableNumber || null,
                } : null,
                customerInfo: {
                    type: order.userId ? "User" : "Guest",
                    name: order.userId?.fullname || guest?.name || "Unknown",
                    email: order.userId?.email || guest?.email || "",
                    contactPhone: order.userId?.phoneNumber || guest?.phoneNumber || booking?.contactPhone || "",
                    deliveryAddress: isDineIn ? booking?.deliveryAddress || "" : order.deliveryAddress || "",
                    notes: isDineIn ? booking?.notes || "" : order.notes || ""
                },
                remainingAmount: order.paymentStatus === "Success"
                    ? 0
                    : (order.totalAmount - (order.prepaidAmount || 0))
            };
        });

        const totalOrders = formattedOrders.length;
        const paginatedOrders = formattedOrders.slice((page - 1) * limit, page * limit);

        res.status(200).json({
            success: true,
            orders: paginatedOrders,
            totalOrders,
            totalPages: Math.ceil(totalOrders / limit)
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id)
            .populate({
                path: "userId",
                select: "fullname email phoneNumber"
            })
            .populate({
                path: "bookingId",
                populate: [
                    { path: "tableId", select: "tableNumber capacity" },
                    { path: "userId", select: "fullname email phoneNumber" }
                ]
            });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const booking = order.bookingId;

        let guest = null;
        if (booking?._id) {
            guest = await Guest.findOne({ bookingId: booking._id }).lean();
        }

        const isDineIn = booking?.orderType === "dine-in";

        const customerInfo = {
            type: order.userId ? "User" : "Guest",
            name: order.userId?.fullname || guest?.name || "Unknown",
            email: order.userId?.email || guest?.email || "",
            contactPhone: order.userId?.phoneNumber || guest?.phoneNumber || booking?.contactPhone || "",
            deliveryAddress: isDineIn ? booking?.deliveryAddress || "" : order.deliveryAddress || "",
            notes: isDineIn ? booking?.notes || "" : order.notes || ""
        };

        const remainingAmount = order.paymentStatus === "Success"
            ? 0
            : (order.totalAmount - (order.prepaidAmount || 0));

        const formattedOrder = {
            ...order.toObject(),
            orderType: isDineIn ? "dine-in" : "delivery",
            bookingInfo: booking ? {
                bookingDate: booking.bookingDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                table: booking.tableId?.tableNumber || null
            } : null,
            customerInfo,
            remainingAmount
        };

        res.status(200).json({
            success: true,
            order: formattedOrder
        });
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus } = req.body;

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.paymentStatus !== "Deposited") {
            return res.status(400).json({
                success: false,
                message: "Only orders with 'Deposited' status can be updated to 'Success'",
            });
        }

        order.paymentStatus = paymentStatus;

        if (paymentStatus === "Success") {
            order.prepaidAmount = order.totalAmount;
        }

        await order.save();


        const remainingAmount = paymentStatus === "Success" ? 0 : (order.totalAmount - (order.prepaidAmount || 0));

        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            order: {
                ...order.toObject(),
                remainingAmount
            },
        });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
