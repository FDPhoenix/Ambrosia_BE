const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  roleName: { type: String },
  description: { type: String },
});

const Role = mongoose.model("Role", roleSchema);
module.exports = Role;
