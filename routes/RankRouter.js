// routes/RankRouter.js
const express = require("express");
const router = express.Router();
const { viewRank, getAllRanks, createRank, updateRank, checkAndUpdateRank } = require("../controllers/RankController");
const { isAuthenticated } = require("../middlewares/isAuthenticate");

router.get("/", isAuthenticated, viewRank);
router.get("/all", getAllRanks);
router.post("/add", createRank);
router.put("/:id", updateRank);
router.post("/update", checkAndUpdateRank);

module.exports = router;
