const express = require("express");
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", notificationController.getNotifications);
router.put("/:id/read", notificationController.markNotificationAsRead);
router.delete("/:id", notificationController.deleteNotification);  // New route for deleting a notification

module.exports = router;
