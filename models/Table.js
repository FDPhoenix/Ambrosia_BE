const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema({
  tableNumber: { type: String, required: true },
  capacity: { type: Number, required: true },
  status: { type: String, default: "available" },
});

const Table = mongoose.model("Table", tableSchema);
module.exports = Table;