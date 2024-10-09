const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");

const validateAndSanitizeInput = (username, email, password) => {
   let errors = {};

   // Validate and sanitize username
   username = username.trim();
   if (!username || username.length < 3 || username.length > 30) {
      errors.username = "Username must be between 3 and 30 characters";
   }

   // Validate and sanitize email
   email = email.trim().toLowerCase();
   if (!validator.isEmail(email)) {
      errors.email = "Please provide a valid email address";
   }

   // Validate password
   if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
   }

   return { username, email, password, errors };
};

exports.getProfile = async (req, res) => {
   try {
      const user = await User.findById(req.user.id).select("-password");

      if (!user) {
         return res.status(404).json({ message: "User not found" });
      }

      // Fetch followers details
      const followers = await User.find({ _id: { $in: user.followers } }, "username email profilePicture title");

      // Fetch following details
      const following = await User.find({ _id: { $in: user.following } }, "username email profilePicture title");

      // Convert to a plain object so we can modify it
      const userObject = user.toObject();

      // Replace IDs with user details
      userObject.followers = followers;
      userObject.following = following;

      // Add counts
      userObject.followersCount = followers.length;
      userObject.followingCount = following.length;

      console.log("userObject", userObject);

      res.json(userObject);
   } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Error fetching user profile" });
   }
};

exports.updateProfile = async (req, res) => {
   try {
      const updateFields = {};
      const allowedFields = [
         "username",
         "email",
         "profilePicture",
         "title",
         "location",
         "bio",
         "learningGoals",
         "skills",
         "work",
         "education",
         "website",
      ];

      // Only include fields that are present in the request body
      allowedFields.forEach((field) => {
         if (req.body[field] !== undefined) {
            updateFields[field] = req.body[field];
         }
      });

      // Handle nested objects (work and education) separately
      ["work", "education"].forEach((field) => {
         if (req.body[field]) {
            updateFields[field] = {};
            Object.keys(req.body[field]).forEach((subField) => {
               if (req.body[field][subField] !== undefined) {
                  updateFields[field][subField] = req.body[field][subField];
               }
            });
         }
      });

      const user = await User.findByIdAndUpdate(req.user.id, { $set: updateFields }, { new: true, runValidators: true }).select(
         "-password",
      );

      if (!user) {
         return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
   } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({ message: error.message });
   }
};

exports.register = async (req, res) => {
   try {
      let { username, email, password } = req.body;

      // Validate and sanitize input
      const validationResult = validateAndSanitizeInput(username, email, password);
      username = validationResult.username;
      email = validationResult.email;
      password = validationResult.password;

      if (Object.keys(validationResult.errors).length > 0) {
         return res.status(400).json({ errors: validationResult.errors });
      }

      console.log("Registration attempt:", { username, email });

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
         console.log("User already exists:", email);
         return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      console.log("Password hashed successfully", hashedPassword);

      // Create new user
      user = new User({
         username,
         email,
         password: hashedPassword,
      });

      await user.save();
      console.log("User saved successfully:", user._id);

      res.status(201).json({ message: "User registered successfully" });
   } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.login = async (req, res) => {
   try {
      let { email, password } = req.body;

      // Sanitize email
      email = email.trim().toLowerCase();

      if (!validator.isEmail(email)) {
         return res.status(400).json({ message: "Invalid email format" });
      }

      console.log("Login attempt:", email);

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
         console.log("User not found:", email);
         return res.status(400).json({ message: "Invalid credentials" });
      }

      console.log("User found:", user._id);
      console.log("Input password:", password);
      console.log("Stored hashed password:", user.password);

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password match:", isMatch);

      if (!isMatch) {
         console.log("Password mismatch for user:", user._id);
         return res.status(400).json({ message: "Invalid credentials" });
      }

      // Generate JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
      console.log("Login successful, token generated");

      res.json({ token, user });
   } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.followUser = async (req, res) => {
   try {
      const userToFollow = await User.findById(req.params.id);
      let currentUser = await User.findById(req.user.id);

      if (!userToFollow) {
         return res.status(404).json({ message: "User not found" });
      }

      if (userToFollow._id.toString() === currentUser._id.toString()) {
         return res.status(400).json({ message: "You cannot follow yourself" });
      }

      if (currentUser.following.includes(userToFollow._id)) {
         return res.status(400).json({ message: "You are already following this user" });
      }

      // Add userToFollow to current user's following list
      currentUser.following.push(userToFollow._id);
      await currentUser.save();

      // Add current user to userToFollow's followers list
      userToFollow.followers.push(currentUser._id);
      await userToFollow.save();

      // Fetch the updated current user with populated following and followers
      currentUser = await User.findById(req.user.id)
         .select("-password")
         .populate('followers', 'username email profilePicture title')
         .populate('following', 'username email profilePicture title');

      res.json({
         message: "Successfully followed user",
         user: currentUser
      });
   } catch (error) {
      console.error("Follow error:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.unfollowUser = async (req, res) => {
   try {
      const userToUnfollow = await User.findById(req.params.id);
      let currentUser = await User.findById(req.user.id);

      if (!userToUnfollow) {
         return res.status(404).json({ message: "User not found" });
      }

      if (!currentUser.following.includes(userToUnfollow._id)) {
         return res.status(400).json({ message: "You are not following this user" });
      }

      // Remove userToUnfollow from current user's following list
      currentUser.following = currentUser.following.filter((id) => id.toString() !== userToUnfollow._id.toString());
      await currentUser.save();

      // Remove current user from userToUnfollow's followers list
      userToUnfollow.followers = userToUnfollow.followers.filter((id) => id.toString() !== currentUser._id.toString());
      await userToUnfollow.save();

      // Fetch the updated current user with populated following and followers
      currentUser = await User.findById(req.user.id)
         .select("-password")
         .populate('followers', 'username email profilePicture title')
         .populate('following', 'username email profilePicture title');

      res.json({
         message: "Successfully unfollowed user",
         user: currentUser
      });
   } catch (error) {
      console.error("Unfollow error:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getFollowers = async (req, res) => {
   try {
      const user = await User.findById(req.params.id).populate("followers", "username email profilePicture");

      if (!user) {
         return res.status(404).json({ message: "User not found" });
      }

      res.json(user.followers);
   } catch (error) {
      console.error("Error fetching followers:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getFollowing = async (req, res) => {
   try {
      const user = await User.findById(req.params.id).populate("following", "username email profilePicture");

      if (!user) {
         return res.status(404).json({ message: "User not found" });
      }

      res.json(user.following);
   } catch (error) {
      console.error("Error fetching following:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getConnections = async (req, res) => {
   try {
      const user = await User.findById(req.user.id)
         .populate("followers", "username email profilePicture lastActive")
         .populate("following", "username email profilePicture lastActive");

      if (!user) {
         return res.status(404).json({ message: "User not found" });
      }

      console.log("user.followers", user);

      // Combine followers and following, remove duplicates, and sort by lastActive
      const connections = [...user.followers, ...user.following]
         .filter((connection, index, self) => index === self.findIndex((t) => t._id.toString() === connection._id.toString()))
         .sort((a, b) => b.lastActive - a.lastActive);

      // Add a flag to indicate if the user is a follower, following, or both
      const connectionsWithFlags = connections.map((connection) => ({
         ...connection.toObject(),
         isFollower: user.followers.some((follower) => follower._id.toString() === connection._id.toString()),
         isFollowing: user.following.some((followedUser) => followedUser._id.toString() === connection._id.toString()),
      }));

      res.json(connectionsWithFlags);
   } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.suggestConnections = async (req, res) => {
   try {
      const currentUser = await User.findById(req.user.id);
      if (!currentUser) {
         return res.status(404).json({ message: "User not found" });
      }

      const { limit = 5, considerSkills = true, considerLearningGoals = true } = req.body;

      let matchStage = {
         $match: {
            _id: { $nin: [...currentUser.following, currentUser._id] },
         },
      };

      let addFieldsStage = {
         $addFields: {
            commonInterests: 0,
            matchingSkills: [],
            matchingLearningGoals: [],
         },
      };

      if (considerSkills && currentUser.skills && currentUser.skills.length > 0) {
         addFieldsStage.$addFields.matchingSkills = {
            $setIntersection: ["$skills", currentUser.skills],
         };
         addFieldsStage.$addFields.commonInterests = {
            $add: ["$commonInterests", { $size: "$matchingSkills" }],
         };
      }

      if (considerLearningGoals && currentUser.learningGoals && currentUser.learningGoals.length > 0) {
         addFieldsStage.$addFields.matchingLearningGoals = {
            $setIntersection: ["$learningGoals", currentUser.learningGoals],
         };
         addFieldsStage.$addFields.commonInterests = {
            $add: ["$commonInterests", { $size: "$matchingLearningGoals" }],
         };
      }

      const suggestedUsers = await User.aggregate([
         matchStage,
         addFieldsStage,
         {
            $sort: {
               commonInterests: -1,
               lastActive: -1,
            },
         },
         {
            $limit: limit,
         },
         {
            $project: {
               _id: 1,
               username: 1,
               email: 1,
               profilePicture: 1,
               title: 1,
               skills: 1,
               learningGoals: 1,
               matchingSkills: 1,
               matchingLearningGoals: 1,
               commonInterests: 1,
            },
         },
      ]);

      // Format the response to include reasons for suggestion
      const formattedSuggestions = suggestedUsers.map((user) => {
         let reasons = [];
         if (user.matchingSkills && user.matchingSkills.length > 0) {
            reasons.push(`Shares ${user.matchingSkills.length} skills: ${user.matchingSkills.join(", ")}`);
         }
         if (user.matchingLearningGoals && user.matchingLearningGoals.length > 0) {
            reasons.push(`Has ${user.matchingLearningGoals.length} common learning goals: ${user.matchingLearningGoals.join(", ")}`);
         }
         if (reasons.length === 0) {
            reasons.push("Suggested based on recent activity");
         }

         return {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            title: user.title,
            commonInterests: user.commonInterests || 0,
            reasons: reasons,
         };
      });

      res.json(formattedSuggestions);
   } catch (error) {
      console.error("Error suggesting connections:", error);
      res.status(500).json({ message: "Error suggesting connections" });
   }
};