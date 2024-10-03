const express = require("express");
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:roomId", authMiddleware, chatController.getMessages);
router.post("/", authMiddleware, chatController.sendMessage);
router.get("/recent", authMiddleware, chatController.getRecentChats);

module.exports = router;
