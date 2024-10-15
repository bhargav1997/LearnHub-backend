const express = require("express");

const eventController = require("../controllers/eventController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, eventController.getEvents);
router.post("/", authMiddleware, eventController.createEvent);
router.put("/:id", authMiddleware, eventController.updateEvent);
router.delete("/:id", authMiddleware, eventController.deleteEvent);

module.exports = router;
