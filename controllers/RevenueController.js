const Order = require("../models/Order");
const ExcelJS = require("exceljs");
const BookingDish = require("../models/BookingDish");
const InvoiceTemplate = require("../models/InvoiceTemplate");

exports.getRevenue = async (req, res) => {
  try {
    let { year, month, day } = req.query;

    const today = new Date();
    year = year ? parseInt(year) : today.getFullYear();
    month = month ? parseInt(month) : today.getMonth() + 1;
    day = day ? parseInt(day) : null;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }

    if (day && (isNaN(day) || day < 1 || day > 31)) {
      return res.status(400).json({ message: "Invalid day" });
    }

    // Get by specific day
    if (day) {
      const startDate = new Date(year, month - 1, day, 0, 0, 0);
      const endDate = new Date(year, month - 1, day, 23, 59, 59);

      const revenue = await Order.aggregate([
        {
          $match: {
            paymentStatus: "Success", // Fixed paymentStatus
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]);

      return res.json({
        year,
        month,
        day,
        revenue: revenue.length > 0 ? revenue[0].totalRevenue : 0,
      });
    }
    // Get by month
    else {
      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const revenueByDay = await Order.aggregate([
        {
          $match: {
            paymentStatus: "Success", // Ensure correct status data is retrieved
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            revenue: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      const revenueList = revenueByDay.map((item) => ({
        day: item._id,
        revenue: item.revenue,
      }));

      const totalRevenue = revenueByDay.reduce(
        (sum, item) => sum + item.revenue,
        0
      );

      return res.json({
        year,
        month,
        revenueList,
        totalRevenue,
      });
    }
  } catch (error) {
    console.error("🔥 Error in getRevenue:", error);
    res.status(500).json({
      message: "Error retrieving revenue statistics",
      error: error.message,
    });
  }
};

exports.getOrdersByDate = async (req, res) => {
  try {
    const { year, month, day } = req.params;
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: "Success",
    })
      .populate("userId")
      .populate("bookingId");

    res.json({ date: `${day}/${month}/${year}`, orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(500)
      .json({ message: "Error retrieving order list", error: error.message });
  }
};

exports.exportRevenueReport = async (req, res) => {
  try {
    let { year, month } = req.query;
    year = parseInt(year);
    month = parseInt(month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Query MongoDB to get revenue data by day
    const revenueData = await Order.aggregate([
      {
        $match: {
          paymentStatus: "Success",
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%d/%m/%Y", date: "$createdAt" } },
          },
          revenue: { $sum: "$totalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Create a complete list of days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const completeData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${String(day).padStart(2, "0")}/${String(month).padStart(
        2,
        "0"
      )}/${year}`;
      const existingData = revenueData.find(
        (item) => item._id.date === dateStr
      );
      completeData.push({
        day: dateStr,
        totalOrders: existingData ? existingData.totalOrders : 0,
        revenue: existingData ? existingData.revenue : 0,
      });
    }

    // Create Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Revenue_${month}_${year}`);

    worksheet.columns = [
      { header: "Day", key: "day", width: 15 },
      { header: "Total Orders", key: "totalOrders", width: 15 },
      { header: "Revenue (VND)", key: "revenue", width: 20 },
    ];

    completeData.forEach((item) => {
      worksheet.addRow(item);
    });

    // Export file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Revenue_${month}_${year}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting report:", error);
    res.status(500).json({
      message: "Error exporting revenue report",
      error: error.message,
    });
  }
};

exports.getBillDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate({
        path: "bookingId",
        select: "orderType bookingDate status tableId",
        populate: {
          // Populate additional Table information
          path: "tableId",
          model: "Table",
          select: "tableNumber capacity",
        },
      })
      .populate({
        path: "userId",
        select: "fullname",
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found!",
      });
    }
    if (!order.bookingId) {
      return res.status(400).json({
        success: false,
        message: "Order does not have a bookingId!",
      });
    }

    const items = await BookingDish.find({
      bookingId: order.bookingId._id,
    }).populate({
      path: "dishId",
      select: "name price imageUrl",
    });

    // Calculate total based on quantity (assuming BookingDish has quantity)
    const data = {
      ...order.toObject(),
      items: items.map((item) => ({
        ...item.toObject(),
        totalPrice: (item.quantity || 1) * item.dishId.price, // If no quantity, default to 1
      })),
    };

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error getting order information:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving order!",
      error: error.message,
    });
  }
};

exports.printBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { fields } = req.body; 
    
    const allowedFields = Array.isArray(fields) ? fields : [];

    const order = await Order.findById(id)
      .populate({
        path: "bookingId",
        select: "orderType bookingDate status tableId",
        populate: {
          path: "tableId",
          model: "Table",
          select: "tableNumber capacity",
        },
      })
      .populate({
        path: "userId",
        select: "fullname",
      });

    if (!order || !order.bookingId) {
      return res
        .status(404)
        .send("<h3>Order or booking not found!</h3>");
    }

    const items = await BookingDish.find({
      bookingId: order.bookingId._id,
    }).populate({
      path: "dishId",
      select: "name price imageUrl",
    });

    let totalAmount = 0;
    let itemRows = items
      .map((item, index) => {
        const quantity = item.quantity || 1;
        const itemTotal = quantity * item.dishId.price;
        totalAmount += itemTotal;
        return `<tr>
                        <td>${index + 1}</td>
                        <td>${item.dishId.name}</td>
                        <td>${quantity}</td>
                        <td>${item.dishId.price.toLocaleString()} VND</td>
                        <td>${itemTotal.toLocaleString()} VND</td>
                    </tr>`;
      })
      .join("");

    // only display if in allowedFields or allowedFields is empty (default print all)
    const showField = (field) =>
      allowedFields.length === 0 || allowedFields.includes(field);

    const billHtml = `
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid black; padding: 5px; text-align: left; }
        th { background-color: #f2f2f2; }
        .info-section { margin-bottom: 20px; }
        .label { font-weight: bold; }
    </style>
</head>
<body>
    <h2 style="text-align: center;">Ambrosia</h2>
    <div class="info-section">
        <p><span class="label">ID: </span> ${order.id}</p>
        <p><span class="label">Customer:</span> ${order.userId.fullname}</p>
        ${
          showField("bookingDate")
            ? `<p><span class="label">Booking Date:</span> ${new Date(
                order.bookingId.bookingDate
              ).toLocaleString()}</p>`
            : ""
        }
        ${
          showField("orderType")
            ? `<p><span class="label">Order Type:</span> ${order.bookingId.orderType}</p>`
            : ""
        }
        ${
          showField("status")
            ? `<p><span class="label">Status:</span> ${order.bookingId.status}</p>`
            : ""
        }
        ${
          showField("orderId")
            ? `<p><span class="label">Order ID:</span> ${order._id}</p>`
            : ""
        }
        ${
          showField("tableInfo") && order.bookingId.tableId
            ? `<p><span class="label">Table No:</span> ${order.bookingId.tableId.tableNumber} (Capacity: ${order.bookingId.tableId.capacity})</p>`
            : ""
        }
        ${
          showField("prepaidAmount")
            ? `<p><span class="label">Prepaid Amount:</span> ${order.prepaidAmount.toLocaleString()} VND</p>`
            : ""
        }
        ${
          showField("paymentMethod")
            ? `<p><span class="label">Payment Method:</span> ${
                order.paymentMethod || "Unknown"
              }</p>`
            : ""
        }
        ${
          showField("paymentStatus")
            ? `<p><span class="label">Payment Status:</span> ${
                order.paymentStatus || "Unknown"
              }</p>`
            : ""
        }
        ${
          showField("createdAt")
            ? `<p><span class="label">Created At:</span> ${new Date(
                order.createdAt
              ).toLocaleString()}</p>`
            : ""
        }
    </div>

    <table>
        <tr>
            <th>#</th>
            <th>Dish</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
        </tr>
        ${itemRows}
        <tr>
            <td colspan="4"><strong>Total</strong></td>
            <td><strong>${totalAmount.toLocaleString()} VND</strong></td>
        </tr>
    </table>
</body>
<script>
window.onload = function() {
    window.print();
};
</script>
</html>
`;

    res.send(billHtml);
  } catch (error) {
    console.error("Error printing bill:", error);
    res.status(500).send("<h3>Error printing bill!</h3>");
  }
};

exports.saveTemplate = async (req, res) => {
  const { name, fields } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ message: "Template name cannot be empty" });
  }

  try {
    const template = await InvoiceTemplate.findOneAndUpdate(
      { name },
      { $set: { fields } },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Template saved successfully", template });
  } catch (error) {
    console.error("Error saving template:", error);
    res.status(500).json({ message: "Error saving template", error: error.message });
  }
};

// Get all templates to choose from (no userId needed)
exports.getTemplates = async (req, res) => {
  try {
    const templates = await InvoiceTemplate.find().select("name fields -_id");
    res.json({ templates });
  } catch (error) {
    console.error("Error getting templates:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteTemplate = async (req, res) => {
  const { name } = req.params;
  if (!name) {
    return res.status(400).json({ message: "Template name cannot be empty" });
  }

  try {
    const deleted = await InvoiceTemplate.findOneAndDelete({ name });
    if (!deleted) {
      return res.status(404).json({ message: "Template not found for deletion" });
    }
    return res.json({ message: `Template '${name}' deleted successfully` });
  } catch (error) {
    console.error("Error deleting template:", error);
    return res.status(500).json({ message: "Server error when deleting template" });
  }
};