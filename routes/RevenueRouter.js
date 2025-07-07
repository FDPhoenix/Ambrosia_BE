const express = require("express");
const { getRevenue, getOrdersByDate, exportRevenueReport, getBillDetails, printBill,saveTemplate, getTemplates,deleteTemplate} = require("../controllers/RevenueController");
const { isAuthenticated, isAdmin } = require("../middlewares/isAuthenticate");  
const statisUser = require('../controllers/StatisUserController');

const router = express.Router();

// Temporarily remove authentication for testing
// router.use(isAuthenticated);
// router.use(isAdmin);

router.get("/", getRevenue);
router.get("/:year/:month/:day", getOrdersByDate);
router.get("/export-revenue", exportRevenueReport);
router.get("/order/:id", getBillDetails);
router.post("/printBill/:id", printBill);

router.get('/line-chart', statisUser.getLineChartData);
router.get('/bar-chart', statisUser.getBarChartData);
router.get('/quantity', statisUser.getUserCounts);


router.get('/feedback/count', statisUser.getFeedbackCount);
router.get('/feedback/by-dish', statisUser.getFeedbackByDish);
router.get('/feedback/pie-chart', statisUser.getFeedbackPieChartData);

router.post("/save", saveTemplate);
router.get("/templates", getTemplates);
router.delete("/deleteTemplate/:name", deleteTemplate);

module.exports = router;