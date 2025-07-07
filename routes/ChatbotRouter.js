const express = require('express');
const router = express.Router();
const ChatbotController = require('../controllers/ChatbotController');

router.post('/message', ChatbotController.sendMessage);

module.exports = router;