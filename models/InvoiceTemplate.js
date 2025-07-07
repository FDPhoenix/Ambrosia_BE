const mongoose = require("mongoose");

const InvoiceTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true}, 
  fields: [{ type: String }], 
});

module.exports = mongoose.model("InvoiceTemplate", InvoiceTemplateSchema);
