const express = require("express");
const userController = require("../controllers/UserController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/profile", authMiddleware, userController.getProfile);
router.put("/profile", authMiddleware, userController.updateProfile);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/follow/:id", authMiddleware, userController.followUser);
router.post("/unfollow/:id", authMiddleware, userController.unfollowUser);
router.get("/followers/:id", authMiddleware, userController.getFollowers);
router.get("/following/:id", authMiddleware, userController.getFollowing);
router.get("/connections", authMiddleware, userController.getConnections);
router.post("/suggest-connections", authMiddleware, userController.suggestConnections);

module.exports = router;
