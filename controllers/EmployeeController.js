const bcrypt = require("bcryptjs");
const User = require("../models/User");
const UserRole = require("../models/UserRole");
const Role = require("../models/Role");
const Booking = require("../models/Booking");
const BookingDish = require("../models/BookingDish");
const Table = require("../models/Table");
const Guest = require("../models/Guest"); // nếu bạn lưu như vậy


exports.addStaff = async (req, res) => {
    const { fullname, email, password, phoneNumber, profileImage } = req.body;

    try {
        if (!fullname || !email || !password || !phoneNumber) {
            return res.status(400).json({ message: "All fields are required.", success: false });
        }

        if (fullname.length > 50 || !/^[a-zA-ZÀ-ỹ]+( [a-zA-ZÀ-ỹ]+){0,2}$/.test(fullname)) {
            return res.status(400).json({ message: "Full Name format is incorrect.", success: false });
        }

        if (email.length > 50 || /\s/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format.", success: false });
        }

        if (!/^\d+$/.test(phoneNumber) || phoneNumber.length > 15) {
            return res.status(400).json({ message: "Phone number format is incorrect.", success: false });
        }

        if (password.length > 50 || /\s/.test(password)) {
            return res.status(400).json({ message: "Password format is incorrect.", success: false });
        }

        const isExist = await User.findOne({ email });
        if (isExist) {
            return res.status(400).json({ message: "Email is already registered.", success: false });
        }

        const role = await Role.findOne({ roleName: "staff" });
        if (!role) {
            return res.status(400).json({ message: "Staff role not found.", success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            fullname,
            email,
            password: hashedPassword,
            phoneNumber,
            profileImage: profileImage || "https://example.com/default-profile.png",
            isActive: true,
        });

        await UserRole.create({
            userId: newUser._id,
            roleId: role._id,
        });

        res.status(201).json({
            message: "Staff added successfully.",
            success: true,
            user: { id: newUser._id, fullname, email, phoneNumber, profileImage, role: "staff" },
        });
    } catch (error) {
        console.error("Error adding staff:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.addChef = async (req, res) => {
    const { fullname, email, password, phoneNumber, profileImage } = req.body;

    try {
        if (!fullname || !email || !password || !phoneNumber) {
            return res.status(400).json({ message: "All fields are required.", success: false });
        }

        if (fullname.length > 50 || !/^[a-zA-ZÀ-ỹ]+( [a-zA-ZÀ-ỹ]+){0,2}$/.test(fullname)) {
            return res.status(400).json({ message: "Full Name format is incorrect.", success: false });
        }

        if (email.length > 50 || /\s/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format.", success: false });
        }

        if (!/^\d+$/.test(phoneNumber) || phoneNumber.length > 15) {
            return res.status(400).json({ message: "Phone number format is incorrect.", success: false });
        }

        if (password.length > 50 || /\s/.test(password)) {
            return res.status(400).json({ message: "Password format is incorrect.", success: false });
        }

        const isExist = await User.findOne({ email });
        if (isExist) {
            return res.status(400).json({ message: "Email is already registered.", success: false });
        }

        const role = await Role.findOne({ roleName: "chef" });
        if (!role) {
            return res.status(400).json({ message: "Chef role not found.", success: false });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            fullname,
            email,
            password: hashedPassword,
            phoneNumber,
            profileImage: profileImage || "https://example.com/default-profile.png",
            isActive: true,
        });

        await UserRole.create({
            userId: newUser._id,
            roleId: role._id,
        });

        res.status(201).json({
            message: "Chef added successfully.",
            success: true,
            user: { id: newUser._id, fullname, email, phoneNumber, profileImage, role: "chef" },
        });
    } catch (error) {
        console.error("Error adding chef:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.getStaff = async (req, res) => {
    try {
        const role = await Role.findOne({ roleName: "staff" });
        if (!role) {
            return res.status(404).json({ message: "Staff role not found.", success: false });
        }

        const userRoles = await UserRole.find({ roleId: role._id });
        const userIds = userRoles.map((ur) => ur.userId);
        const employees = await User.find({ _id: { $in: userIds } })
            .select("-password")
            .lean();

        res.status(200).json({ success: true, employees });
    } catch (error) {
        console.error("Error fetching staff:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.getChef = async (req, res) => {
    try {
        const role = await Role.findOne({ roleName: "chef" });
        if (!role) {
            return res.status(404).json({ message: "Chef role not found.", success: false });
        }

        const userRoles = await UserRole.find({ roleId: role._id });
        const userIds = userRoles.map((ur) => ur.userId);
        const employees = await User.find({ _id: { $in: userIds } })
            .select("-password")
            .lean();

        res.status(200).json({ success: true, employees });
    } catch (error) {
        console.error("Error fetching chefs:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.getEmployeeById = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id).select("-password").lean();
        if (!user) {
            return res.status(404).json({ message: "Employee not found", success: false });
        }

        const userRole = await UserRole.findOne({ userId: id }).populate("roleId");
        user.role = userRole?.roleId?.roleName || "Unknown";

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error fetching employee:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};


exports.updateEmployee = async (req, res) => {
    const { id } = req.params;
    const { fullname, email, phoneNumber, profileImage, password, isActive } = req.body;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Employee not found", success: false });
        }

        if (fullname) user.fullname = fullname;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (profileImage) user.profileImage = profileImage;
        if (isActive !== undefined) user.isActive = isActive;

        // // Cập nhật mật khẩu nếu có thay đổi
        // if (password) {
        //     if (password.length > 50 || /\s/.test(password)) {
        //         return res.status(400).json({ message: "Invalid password format", success: false });
        //     }
        //     const hashedPassword = await bcrypt.hash(password, 10);
        //     user.password = hashedPassword;
        // }

        await user.save();

        res.status(200).json({
            message: "Employee updated successfully.",
            success: true,
            user,
        });
    } catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.deleteEmployee = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Employee not found", success: false });
        }

        await UserRole.deleteMany({ userId: id });

        await User.findByIdAndDelete(id);

        res.status(200).json({ message: "Employee deleted successfully", success: true });
    } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

exports.verifyBookingByStaff = async (req, res) => {
    const { bookingId } = req.params;

    try {
        const booking = await Booking.findById(bookingId)
            .populate("userId", "fullname email phoneNumber")
            .populate("tableId", "tableNumber capacity")
            .lean();

        if (!booking) {
            return res.status(404).json({ message: "Invalid QR Code: Booking not found", success: false });
        }

        if (booking.status !== "pending") {
            return res.status(400).json({
                message: `Booking already ${booking.status}`,
                success: false
            });
        }

        const bookingDishes = await BookingDish.find({ bookingId })
            .populate("dishId", "name price")
            .lean();

        const dishDetails = [];
        let total = 0;

        if (bookingDishes && bookingDishes.length > 0) {
            for (const dish of bookingDishes) {
                const price = dish?.dishId?.price || 0;
                const quantity = dish?.quantity || 0;
                total += price * quantity;

                dishDetails.push({
                    name: dish?.dishId?.name || "Unknown",
                    price,
                    quantity
                });
            }
        }

        let guest = null;
        if (!booking.userId) {
            guest = await Guest.findOne({ bookingId: booking._id }).lean();
        }

        return res.status(200).json({
            success: true,
            booking: {
                _id: booking._id,
                customerName: booking.userId?.fullname || guest?.name || "Guest",
                customerEmail: booking.userId?.email || guest?.email || "",
                contactPhone: booking.contactPhone || booking.userId?.phoneNumber || guest?.contactPhone || "",
                tableNumber: booking.tableId?.tableNumber || "Unknown",
                tableCapability: booking.tableId?.capacity || 0,
                bookingDate: booking.bookingDate || null,
                time: booking.startTime || booking.time || "",
                notes: booking.notes || "",
                status: booking.status,
                dishes: dishDetails,
                totalBill: total,
                orderType: booking.orderType,
                deliveryAddress: booking.deliveryAddress || null,
                pickupTime: booking.pickupTime || null
            }
        });
    } catch (error) {
        console.error("Error verifying booking QR:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};

