const express = require("express");
const router = express.Router();
const { getBestSellers } = require("../controllers/BestsellerController");

router.get("/bestsellers", getBestSellers);

module.exports = router;