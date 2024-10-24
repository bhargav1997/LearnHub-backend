const express = require("express");
const postController = require("../controllers/postController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Add this new route for creating posts
router.post("/", postController.createPost);
router.put("/:postId", postController.updatePost);
router.delete("/:postId", postController.deletePost);
router.get("/", postController.getAllPosts);
router.get("/:postId", postController.getPost);

// New route to get posts from followed users
router.get("/following", postController.getFollowingPosts);

module.exports = router;
