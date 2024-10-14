const express = require("express");
const taskController = require("../controllers/taskController");
const authMiddleware = require("../middleware/authMiddleware");
const learningTaskController = require("../controllers/learningTaskController");
const { default: rateLimit } = require("express-rate-limit");

const router = express.Router();

// Create a rate limiter specifically for learning task creation
const learningTaskLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   max: 5, // limit each IP to 5 learning task creations per windowMs
   message: "Too many learning tasks created from this IP, please try again after 15 minutes",
});

// Add this line for debugging
router.use((req, res, next) => {
   console.log(`Request received: ${req.method} ${req.url}`);
   next();
});

// Apply the rate limiter to all routes in this router

router.use(authMiddleware);

// router.post("/", taskController.createTask);
router.get("/", taskController.getTasks);
// router.get("/:id", taskController.getTask);
// router.put("/:id", taskController.updateTask);
// router.delete("/:id", taskController.deleteTask);
router.post("/learning-task", learningTaskLimiter, learningTaskController.createLearningTask);
router.get("/learning-tasks", learningTaskController.getLearningTasks);
router.put("/learning-tasks/:taskId/progress", learningTaskController.updateTaskProgress);

module.exports = router;
