const express = require("express");
const { getAllTables, addTable, getAvailableTables, updateTable, deleteTable, getTableByNumber } = require("../controllers/TableController");

const tableRouter = express.Router();

tableRouter.use(express.json());


tableRouter.get("/available-numbers", getAvailableTables);

tableRouter.get("/", getAllTables);

tableRouter.post("/", addTable);

tableRouter.put("/:tableNumber", updateTable);

tableRouter.delete("/:tableNumber", deleteTable);

tableRouter.get("/:tableNumber", getTableByNumber);

module.exports = tableRouter;
