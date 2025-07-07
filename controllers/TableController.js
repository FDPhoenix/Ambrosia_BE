const Table = require("../models/Table");

const generateTableList = () => {
    const sections = ["A", "B", "C"];
    const maxTablePerSection = 10;

    let allTables = [];
    sections.forEach(section => {
        for (let i = 1; i <= maxTablePerSection; i++) {
            allTables.push(`${section}${i}`);
        }
    });

    return allTables;
};

exports.getAvailableTables = async (req, res) => {
    try {
        const existingTables = await Table.find({}, "tableNumber");
        const existingTableNumbers = existingTables.map(t => t.tableNumber);

        const allPossibleTables = generateTableList();
        const availableTables = allPossibleTables.filter(num => !existingTableNumbers.includes(num));

        res.status(200).json({
            success: true,
            message: "Available tables fetched successfully",
            availableTables
        });
    } catch (error) {
        console.error("Error fetching available tables:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

exports.getAllTables = async (req, res) => {
    try {
        const tables = await Table.find().sort({ tableNumber: 1 });
        res.status(200).json({
            success: true,
            message: "List of tables fetched successfully",
            tables,
        });
    } catch (error) {
        console.error("Error fetching tables:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

exports.addTable = async (req, res) => {
    const { tableNumber, capacity, status } = req.body;

    try {
        if (!tableNumber || !capacity) {
            return res.status(400).json({
                success: false,
                message: "Table number and capacity are required",
            });
        }

        const existingTable = await Table.findOne({ tableNumber });
        if (existingTable) {
            return res.status(400).json({
                success: false,
                message: "Table already exists",
            });
        }

        const newTable = new Table({
            tableNumber,
            capacity,
            status: status || "available",
        });

        await newTable.save();

        res.status(201).json({
            success: true,
            message: "Table added successfully",
            table: newTable,
        });
    } catch (error) {
        console.error("Error adding table:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};


exports.updateTable = async (req, res) => {
    const { tableNumber } = req.params;
    const { capacity, status } = req.body;

    try {
        const existingTable = await Table.findOne({ tableNumber });
        if (!existingTable) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }

        if (capacity !== undefined) existingTable.capacity = capacity;
        if (status !== undefined) existingTable.status = status;

        await existingTable.save();

        res.status(200).json({
            success: true,
            message: "Table updated successfully",
            table: existingTable,
        });
    } catch (error) {
        console.error("Error updating table:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

exports.deleteTable = async (req, res) => {
    const { tableNumber } = req.params;

    try {
        const existingTable = await Table.findOne({ tableNumber });
        if (!existingTable) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }

        if (existingTable.status === "occupied" || existingTable.status === "reserved") {
            return res.status(400).json({
                success: false,
                message: "Cannot delete table that is currently occupied or reserved",
            });
        }

        await Table.deleteOne({ tableNumber });

        res.status(200).json({
            success: true,
            message: "Table deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting table:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

exports.getTableByNumber = async (req, res) => {
    const { tableNumber } = req.params;

    try {
        const table = await Table.findOne({ tableNumber });
        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Table details fetched successfully",
            table,
        });
    } catch (error) {
        console.error("Error fetching table details:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

// exports.deleteTable = async (req, res) => {
//     let { tableNumber } = req.params;
//     tableNumber = tableNumber.trim();

//     try {
//         const existingTable = await Table.findOne({ tableNumber: String(tableNumber) });

//         if (!existingTable) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Table not found",
//             });
//         }

//         // 🔥 Lấy danh sách đặt chỗ trong tương lai
//         const futureBookings = await Booking.find({
//             tableId: existingTable._id,
//             bookingDate: { $gte: new Date() },
//         });

//         if (futureBookings.length > 0) {
//             // ✅ Hủy tất cả đặt chỗ liên quan
//             await Booking.deleteMany({ tableId: existingTable._id });
//             console.log(`Deleted ${futureBookings.length} future reservations.`);
//         }

//         // 🔥 Xóa bàn sau khi hủy đặt chỗ
//         await Table.deleteOne({ tableNumber: String(tableNumber) });

//         res.status(200).json({
//             success: true,
//             message: "Table and related reservations deleted successfully.",
//         });

//     } catch (error) {
//         console.error("Error deleting table:", error);
//         res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//         });
//     }
// };

