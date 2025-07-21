//controllers/ReservationController
const Booking = require("../models/Booking");
const BookingDish = require("../models/BookingDish");
const Table = require("../models/Table");
const User = require("../models/User");
const Guest = require("../models/Guest");

exports.getAllReservation = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        const totalBookings = await Booking.countDocuments();

        const bookings = await Booking.find()
            .populate("userId", "fullname email phoneNumber")
            .populate("tableId", "tableNumber capacity")
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const bookingIds = bookings.map(b => b._id);

        const bookingDishes = await BookingDish.find({ bookingId: { $in: bookingIds } })
            .populate("dishId", "name imageUrl price")
            .lean();

        const guests = await Guest.find({ bookingId: { $in: bookingIds } }).lean();

        const bookingsWithDetails = bookings.map(booking => ({
            ...booking,
            dishes: bookingDishes.filter(d => d.bookingId.toString() === booking._id.toString()),
            guest: guests.find(g => g.bookingId.toString() === booking._id.toString()) || null,
        }));

        res.status(200).json({
            data: bookingsWithDetails,
            totalPages: Math.ceil(totalBookings / limit),
        });
    } catch (error) {
        console.error("ERROR in getAllReservation:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.getStaffReservation = async (req, res) => {
    try {
        const { page = 1, limit = 6 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Booking.countDocuments({
            status: {
                $in: [
                    "Confirmed", "Canceled", "Cooking", "Ready", "Completed",
                    "confirmed", "canceled", "cooking", "ready", "completed"
                ]
            }
        });
        const bookings = await Booking.find({
            status: {
                $in: [
                    "Confirmed", "Canceled", "Cooking", "Ready", "Completed",
                    "confirmed", "canceled", "cooking", "ready", "completed"
                ]
            }
        })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("userId", "fullname email phoneNumber")
            .populate("tableId", "tableNumber capacity")
            .sort({ _id: -1 })
            // .sort({ bookingDate: 1, startTime: 1 })
            // .sort({
            //     status: -1,
            //     bookingDate: 1,
            //     startTime: 1,
            //     createdAt: 1
            // })
            .lean();

        const bookingIds = bookings.map(booking => booking._id);
        const bookingDishes = await BookingDish.find({ bookingId: { $in: bookingIds } })
            .populate("dishId", "name price imageUrl")
            .lean();

        const guests = await Guest.find({ bookingId: { $in: bookingIds } }).lean();

        const bookingsWithDetails = bookings.map(booking => {
            return {
                ...booking,
                dishes: bookingDishes.filter(dish => dish.bookingId.toString() === booking._id.toString()),
                guest: guests.find(guest => guest.bookingId.toString() === booking._id.toString()) || null
            };
        });

        res.status(200).json({
            data: bookingsWithDetails,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error when getting table order list:", error.message);
        res.status(500).json({ message: "Error getting table order list!", error: error.message });
    }
};

/**
 * 📌 Lấy danh sách bàn có sẵn theo ngày & giờ (tối ưu)
 */
exports.getAvailableTables = async (req, res) => {
    try {
        const { bookingDate, startTime } = req.query;

        if (!bookingDate || !startTime) {
            return res.status(400).json({ message: "Please provide date and time!" });
        }

        if (!bookingDate || !startTime || typeof bookingDate !== "string") {
            return res.status(400).json({ message: "Please provide a valid date and time!" });
        }

        const parsedDate = new Date(bookingDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: "Invalid date!" });
        }

        const formattedBookingDate = new Date(parsedDate.toISOString().split("T")[0]);
        formattedBookingDate.setUTCHours(0, 0, 0, 0);

        const [bookingHour, bookingMinute] = startTime.split(":").map(Number);
        const requestedStart = new Date(formattedBookingDate);
        requestedStart.setUTCHours(bookingHour, bookingMinute, 0, 0);

        const requestedEnd = new Date(requestedStart.getTime() + 5 * 60 * 60 * 1000);
        const tables = await Table.find();

        const bookings = await Booking.find({
            bookingDate: formattedBookingDate,
            tableId: { $in: tables.map(t => t._id) }
        });

        const availableTables = tables.map((table) => {
            const relatedBookings = bookings.filter(
                (booking) => booking.tableId.toString() === table._id.toString()
            );

            let isAvailable = true;

            for (const booking of relatedBookings) {
                const bookingStart = new Date(booking.bookingDate);
                const [bookedHour, bookedMinute] = booking.startTime.split(":").map(Number);
                bookingStart.setUTCHours(bookedHour, bookedMinute, 0, 0);

                const bookingEnd = new Date(bookingStart.getTime() + 5 * 60 * 60 * 1000);

                if (
                    (requestedStart >= bookingStart && requestedStart < bookingEnd) ||
                    (requestedEnd > bookingStart && requestedEnd <= bookingEnd) ||
                    (requestedStart <= bookingStart && requestedEnd >= bookingEnd)
                ) {
                    isAvailable = false;
                    break;
                }
            }

            return {
                ...table.toObject(),
                isAvailable,
                status: isAvailable ? "available" : "reserved",
            };
        });

        res.status(200).json(availableTables);
    } catch (error) {
        console.error("Error when getting table list:", error.message);
        res.status(500).json({ message: "Error getting table list!", error: error.message });
    }
};


exports.updateReservationTable = async (req, res) => {
    try {
        const { id } = req.params;
        const { tableId } = req.body;

        if (!tableId) {
            return res.status(400).json({ message: "Missing tableId!" });
        }

        // Tìm đơn đặt bàn
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found!" });
        }

        // Tìm bàn mới
        const newTable = await Table.findById(tableId);
        if (!newTable) {
            return res.status(404).json({ message: "Table not found!" });
        }

        // Optional: Kiểm tra trạng thái bàn (nếu bạn tin tưởng frontend thì có thể bỏ)
        if (newTable.status !== "available" && newTable._id.toString() !== booking.tableId.toString()) {
            return res.status(400).json({ message: "Selected table is not available!" });
        }


        // Cập nhật bàn cũ (nếu có) thành "available"
        if (booking.tableId) {
            await Table.findByIdAndUpdate(booking.tableId, { status: "available" });
        }

        // Cập nhật tableId mới vào booking
        booking.tableId = tableId;
        await booking.save();

        // Đánh dấu bàn mới là "unavailable"
        newTable.status = "unavailable";
        await newTable.save();

        res.status(200).json({
            message: "Table updated successfully!",
            booking
        });
    } catch (error) {
        console.error("Error updating table:", error.message);
        res.status(500).json({ message: "Server error!", error: error.message });
    }
};



exports.getReservationDetails = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate("tableId", "tableNumber capacity")
            .lean();

        if (!booking) {
            return res.status(404).json({ message: "Order does not exist!" });
        }

        const bookingDishes = await BookingDish.find({ bookingId: booking._id })
            .populate("dishId", "name price category isAvailable")
            .lean();

        booking.dishes = bookingDishes.map(dish => ({
            dishId: dish.dishId?._id || null,
            name: dish.dishId?.name || "Unknown",
            price: dish.dishId?.price || 0,
            category: dish.dishId?.category?.name || "Unknown",
            isAvailable: dish.dishId?.isAvailable ?? false,
            quantity: dish.quantity || 0,
        }));

        if (booking.userId) {
            const user = await User.findById(booking.userId).lean();
            if (!user) {
                return res.status(404).json({ message: "User does not exist!" });
            }

            booking.customer = {
                name: user.fullname || "No name",
                email: user.email || "No email",
                contactPhone: user.phoneNumber || "No phone number",
            };
        } else {
            const guest = await Guest.findOne({ bookingId: booking._id }).lean();
            if (!guest) {
                return res.status(404).json({ message: "Guest information does not exist!" });
            }

            booking.customer = {
                name: guest.name || "No name",
                email: guest.email || "No email",
                contactPhone: guest.contactPhone || "No phone number",
            };
        }

        let bookingDate = new Date(booking.bookingDate);
        if (isNaN(bookingDate.getTime())) {
            return res.status(400).json({ message: "Invalid booking date!" });
        }

        booking.bookingDate = bookingDate.toISOString().split("T")[0];  // YYYY-MM-DD
        res.status(200).json(booking);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving reservation information!", error: error.message });
    }
};

exports.updateReservationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Order does not exist!' });
        }

        if (booking.status === status) {
            return res.status(400).json({ message: `The order is in status "${status}" rồi!` });
        }

        booking.status = status;
        await booking.save();
        console.log(`Order ${id} status has been updated to "${status}".`);

        res.status(200).json({
            message: `Order status has been updated to "${status}".`,
            booking,
        });
    } catch (error) {
        console.error("Error updating booking status:", error.message);
        res.status(500).json({ message: 'Error updating order status!', error: error.message });
    }
};

const mongoose = require("mongoose");
exports.filterReservations = async (req, res) => {
    try {
        const { fromDate, toDate, dateRange, orderType, status, searchText, page = 1, limit = 6 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let filter = {};
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        if (dateRange) {
            switch (dateRange) {
                case "today":
                    filter.bookingDate = { $gte: startOfToday, $lte: endOfToday };
                    break;
                case "yesterday":
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    filter.bookingDate = {
                        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                        $lte: new Date(yesterday.setHours(23, 59, 59, 999)),
                    };
                    break;
                case "last7days":
                    const last7 = new Date();
                    last7.setDate(last7.getDate() - 7);
                    filter.bookingDate = { $gte: last7, $lte: endOfToday };
                    break;
                case "thisMonth":
                    filter.bookingDate = {
                        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
                        $lte: new Date(today.getFullYear(), today.getMonth() + 1, 0),
                    };
                    break;
                case "lastMonth":
                    filter.bookingDate = {
                        $gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
                        $lte: new Date(today.getFullYear(), today.getMonth(), 0),
                    };
                    break;
            }
        }

        if (fromDate || toDate) {
            filter.bookingDate = {};
            if (fromDate) filter.bookingDate.$gte = new Date(fromDate);
            if (toDate) filter.bookingDate.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
        }

        if (orderType) {
            filter.orderType = orderType;
        }

        if (status) {
            filter.$expr = {
                $eq: [{ $toLower: "$status" }, status.toLowerCase()]
            };
        }

        // Tìm userId và bookingId từ searchText
        if (searchText) {
            const searchRegex = new RegExp(searchText, "i");

            const users = await User.find({ fullname: searchRegex }).select("_id").lean();
            const userIds = users.map(u => u._id);

            const guests = await Guest.find({ name: searchRegex }).select("bookingId").lean();
            const guestBookingIds = guests.map(g => g.bookingId);

            if (userIds.length > 0 || guestBookingIds.length > 0) {
                filter.$or = [
                    ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
                    ...(guestBookingIds.length > 0 ? [{ _id: { $in: guestBookingIds } }] : [])
                ];
            } else {
                return res.status(200).json({ data: [], totalPages: 0 });
            }
        }

        const totalCount = await Booking.countDocuments(filter);

        let bookings = await Booking.find(filter)
            .populate("userId", "fullname email phoneNumber")
            .populate("tableId", "tableNumber capacity")
            .sort({ _id: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const bookingIds = bookings.map(b => b._id);

        const bookingDishes = await BookingDish.find({ bookingId: { $in: bookingIds } })
            .populate("dishId", "name imageUrl price")
            .lean();

        const guests = await Guest.find({ bookingId: { $in: bookingIds } }).lean();

        const bookingsWithDetails = bookings.map(b => ({
            ...b,
            dishes: bookingDishes.filter(d => d.bookingId.toString() === b._id.toString()),
            guest: guests.find(g => g.bookingId.toString() === b._id.toString()) || null,
        }));

        return res.status(200).json({
            data: bookingsWithDetails,
            totalPages: Math.ceil(totalCount / limit)
        });

    } catch (error) {
        console.error("ERROR in filterReservations:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};

exports.filterChefReservations = async (req, res) => {
    try {
        const {
            fromDate,
            toDate,
            dateRange,
            orderType,
            searchText,
            status,
            page = 1,
            limit = 6
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let filter = {
            status: { $in: ["Confirmed", "Canceled", "confirmed", "canceled"] }
        };

        if (status) {
            filter.$expr = {
                $eq: [{ $toLower: "$status" }, status.toLowerCase()]
            };
        }

        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        if (dateRange) {
            switch (dateRange) {
                case "today":
                    filter.bookingDate = { $gte: startOfToday, $lte: endOfToday };
                    break;
                case "yesterday":
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    filter.bookingDate = {
                        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                        $lte: new Date(yesterday.setHours(23, 59, 59, 999)),
                    };
                    break;
                case "last7days":
                    const last7 = new Date();
                    last7.setDate(last7.getDate() - 7);
                    filter.bookingDate = { $gte: last7, $lte: endOfToday };
                    break;
                case "thisMonth":
                    filter.bookingDate = {
                        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
                        $lte: new Date(today.getFullYear(), today.getMonth() + 1, 0),
                    };
                    break;
                case "lastMonth":
                    filter.bookingDate = {
                        $gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
                        $lte: new Date(today.getFullYear(), today.getMonth(), 0),
                    };
                    break;
            }
        }

        if (fromDate || toDate) {
            filter.bookingDate = {};
            if (fromDate) filter.bookingDate.$gte = new Date(fromDate);
            if (toDate) filter.bookingDate.$lte = new Date(new Date(toDate).setHours(23, 59, 59, 999));
        }

        if (orderType) {
            filter.orderType = orderType;
        }

        if (searchText) {
            const searchRegex = new RegExp(searchText, "i");

            const users = await User.find({ fullname: searchRegex }).select("_id").lean();
            const userIds = users.map(user => user._id);

            const guests = await Guest.find({ name: searchRegex }).select("bookingId").lean();
            const bookingIdsFromGuest = guests.map(guest => guest.bookingId);

            if (userIds.length > 0 || bookingIdsFromGuest.length > 0) {
                filter.$or = [
                    ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
                    ...(bookingIdsFromGuest.length > 0 ? [{ _id: { $in: bookingIdsFromGuest } }] : []),
                ];
            } else {
                return res.status(200).json({ data: [], totalPages: 0 });
            }
        }

        const total = await Booking.countDocuments(filter);

        let bookings = await Booking.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .populate("userId", "fullname email phoneNumber")
            .populate("tableId", "tableNumber capacity")
            .sort({ _id: -1 })
            .lean();

        const bookingIds = bookings.map(booking => booking._id);

        const bookingDishes = await BookingDish.find({ bookingId: { $in: bookingIds } })
            .populate("dishId", "name imageUrl")
            .lean();

        const guests = await Guest.find({ bookingId: { $in: bookingIds } }).lean();

        bookings = bookings.map(booking => ({
            ...booking,
            dishes: bookingDishes.filter(dish => dish.bookingId.toString() === booking._id.toString()),
            guest: guests.find(guest => guest.bookingId.toString() === booking._id.toString()) || null,
        }));

        res.status(200).json({
            data: bookings,
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error("ERROR in filterChefReservations:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};


exports.deleteBooking = async (req, res) => {
    const { bookingId } = req.params;

    try {
        await BookingDish.deleteMany({ bookingId });

        await Guest.deleteMany({ bookingId });

        const deletedBooking = await Booking.findByIdAndDelete(bookingId);

        if (!deletedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json({ message: 'Booking and related information deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};