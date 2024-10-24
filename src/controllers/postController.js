const Post = require("../models/Post"); // You'll need to create this model
const User = require("../models/User");

exports.createPost = async (req, res) => {
   try {
      const { title, content, tags, image, category } = req.body;
      
      // Validate required fields
      if (!title || !content || !category) {
         return res.status(400).json({ message: "Title, content, and category are required", error: "Invalid request body" });
      }

      // Create new post
      const newPost = new Post({
         title,
         content,
         tags,
         image,
         category,
         author: req.user.id,
      });

      // Save the post to the database
      const savedPost = await newPost.save();

      // Populate author information
      await savedPost.populate('author', 'username profilePicture');

      res.status(201).json({ message: "Post created successfully", error: false, data: savedPost });
   } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Error creating post", error: true, data: null });
   }
};

exports.updatePost = async (req, res) => {
   try {
      const { postId } = req.params;
      const { title, content, tags, image, category } = req.body;
      const updatedPost = await Post.findOneAndUpdate(
         { _id: postId, author: req.user.id },
         { title, content, tags, image, category },
         { new: true },
      );
      if (!updatedPost) {
         return res.status(404).json({ message: "Post not found", error: true });
      }
      res.json({ message: "Post updated successfully", error: false, data: updatedPost });
   } catch (error) {
      res.status(400).json({ message: error.message, error: true });
   }
};

exports.deletePost = async (req, res) => {
   try {
      const { postId } = req.params;
      const deletedPost = await Post.findOneAndDelete({ _id: postId, author: req.user.id });
      if (!deletedPost) {
         return res.status(404).json({ message: "Post not found", error: true });
      }
      res.json({ message: "Post deleted successfully", error: false });
   } catch (error) {
      res.status(500).json({ message: error.message, error: true });
   }
};

exports.getAllPosts = async (req, res) => {
   try {
      const { category, tag, page = 1, limit = 10, followingOnly } = req.query;
      let query = {};
      if (category) query.category = category;
      if (tag) query.tags = tag;

      if (followingOnly === 'true') {
         const currentUser = await User.findById(req.user.id);
         query.author = { $in: currentUser.following };
      }

      const posts = await Post.find(query)
         .populate('author', 'username profilePicture')
         .sort({ createdAt: -1 })
         .skip((page - 1) * limit)
         .limit(Number(limit));

      const total = await Post.countDocuments(query);

      res.json({
         posts,
         totalPages: Math.ceil(total / limit),
         currentPage: page,
      });
   } catch (error) {
      res.status(500).json({ message: error.message, error: true });
   }
};

exports.getPost = async (req, res) => {
   try {
      const { postId } = req.params;
      const post = await Post.findById(postId).populate('author', 'username profilePicture');
      if (!post) {
         return res.status(404).json({ message: "Post not found", error: true });
      }
      res.json({ message: "Post retrieved successfully", error: false, data: post });
   } catch (error) {
      res.status(500).json({ message: error.message, error: true });
   }
};

exports.getFollowingPosts = async (req, res) => {
   try {
      const { page = 1, limit = 10 } = req.query;
      const currentUser = await User.findById(req.user.id);
      
      const posts = await Post.find({ author: { $in: currentUser.following } })
         .populate('author', 'username profilePicture')
         .sort({ createdAt: -1 })
         .skip((page - 1) * limit)
         .limit(Number(limit));

      const total = await Post.countDocuments({ author: { $in: currentUser.following } });

      res.json({
         posts,
         totalPages: Math.ceil(total / limit),
         currentPage: page,
      });
   } catch (error) {
      res.status(500).json({ message: error.message, error: true });
   }
};
