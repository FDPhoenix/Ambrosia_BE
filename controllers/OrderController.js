const Order = require("../models/Order");

exports.getOrders = async (req, res) => {
    try {
        const { userId, paymentStatus, page = 1, limit = 6, orderType, dateRange, fromDate, toDate } = req.query;
        const filter = {};

        if (userId) filter.userId = userId;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        // Chuẩn bị filter cho bookingId
        let bookingFilter = {};
        if (orderType) bookingFilter.orderType = orderType;

        // Xử lý filter ngày
        if (dateRange || fromDate || toDate) {
            bookingFilter.bookingDate = {};
            const now = new Date();
            let startDate, endDate;
            if (dateRange) {
                switch (dateRange) {
                    case "today":
                        startDate = new Date();
                        startDate.setHours(0,0,0,0);
                        endDate = new Date();
                        endDate.setHours(23,59,59,999);
                        break;
                    case "yesterday":
                        startDate = new Date();
                        startDate.setDate(startDate.getDate() - 1);
                        startDate.setHours(0,0,0,0);
                        endDate = new Date(startDate);
                        endDate.setHours(23,59,59,999);
                        break;
                    case "last7days":
                        endDate = new Date();
                        endDate.setHours(23,59,59,999);
                        startDate = new Date();
                        startDate.setDate(startDate.getDate() - 6);
                        startDate.setHours(0,0,0,0);
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

        // Lấy tất cả order phù hợp filter
        const allOrders = await Order.find(filter)
            .populate({
                path: "userId",
                select: "name email"
            })
            .populate({
                path: "bookingId",
                match: Object.keys(bookingFilter).length > 0 ? bookingFilter : undefined
            })
            .sort({ createdAt: -1 });

        // Lọc các order mà bookingId bị null nếu có filter booking
        let filteredOrders = allOrders;
        if (Object.keys(bookingFilter).length > 0) {
            filteredOrders = allOrders.filter(order => order.bookingId);
        }

        const totalOrders = filteredOrders.length;
        const paginatedOrders = filteredOrders.slice((page - 1) * limit, page * limit);

        const formattedOrders = paginatedOrders.map(order => ({
            ...order.toObject(),
            remainingAmount: order.paymentStatus === "Success"
                ? 0
                : (order.totalAmount - (order.prepaidAmount || 0)),
        }));

        res.status(200).json({
            success: true,
            orders: formattedOrders,
            totalOrders,
            totalPages: Math.ceil(totalOrders / limit),
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
            .populate("userId", "name email")
            .populate("bookingId");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }


        const remainingAmount = order.paymentStatus === "Success" ? 0 : (order.totalAmount - (order.prepaidAmount || 0));

        res.status(200).json({
            success: true,
            order: {
                ...order.toObject(),
                remainingAmount
            },
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
