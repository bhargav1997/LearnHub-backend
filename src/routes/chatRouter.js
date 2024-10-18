const express = require("express");
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:roomId", authMiddleware, chatController.getMessages);
router.post("/", authMiddleware, chatController.sendMessage);
router.get("/recent", authMiddleware, chatController.getRecentChats);
router.get("/history/:recipientId", authMiddleware, chatController.getChatHistory);
router.post("/send", authMiddleware, chatController.sendMessage);
router.post("/private", authMiddleware, chatController.sendPrivateMessage);
router.delete("/clear-private-chat/:recipientId", authMiddleware, chatController.clearPrivateChat);

module.exports = router;
