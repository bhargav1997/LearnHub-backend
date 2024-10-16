const express = require("express");
const { default: rateLimit } = require("express-rate-limit");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create a rate limiter specifically for user actions
// const userLimiter = rateLimit({
//    windowMs: 15 * 60 * 1000, // 15 minutes
//    max: 5, // limit each IP to 5 learning task creations per windowMs
//    message: "Too many user actions from this IP, please try again after 15 minutes",
// });

// // Apply the rate limiter to all routes in this router
// router.use(userLimiter);

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
router.post("/verify-2fa-registration", userController.verifyTwoFactorRegistration);
router.post("/verify-2fa", userController.verifyTwoFactor);
router.post("/resend-2fa-code", userController.resendTwoFactorCode);

module.exports = router;
