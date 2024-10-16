const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { generateTwoFactorCode, sendTwoFactorCode } = require("../services/authServices");
const disposableDomains = require("disposable-email-domains");
require("dotenv").config();
// Helper function to check if an email is from a disposable domain
const isDisposableEmail = (email) => {
   const domain = email.split("@")[1];
   return disposableDomains.includes(domain);
};

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

      // Check if the email is from a disposable domain
      if (isDisposableEmail(email)) {
         return res.status(400).json({ message: "Please use a valid, non-disposable email address", error: true });
      }

      // Validate and sanitize input
      const validationResult = validateAndSanitizeInput(username, email, password);
      username = validationResult.username;
      email = validationResult.email;
      password = validationResult.password;

      if (Object.keys(validationResult.errors).length > 0) {
         return res.status(400).json({ errors: validationResult.errors, error: true });
      }

      console.log("Registration attempt:", { username, email });

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
         return res.status(400).json({ message: "User already exists", error: true });
      }
      // Generate and save 2FA code
      // let twoFactorCode = generateTwoFactorCode();

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      user = new User({
         username,
         email,
         password: hashedPassword,
      });

      // user.twoFactorCode = twoFactorCode;
      // user.twoFactorCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

      await user.save();

      // Send 2FA code via email
      // await sendTwoFactorCode(email, twoFactorCode);

      res.status(201).json({ message: "User registered. Please verify your email.", error: false });
   } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error: true });
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
         return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
         return res.status(400).json({ message: "Invalid credentials" });
      }

      if (!user.isVerified) {
         // Generate and save 2FA code
         let twoFactorCode = generateTwoFactorCode();
         user.twoFactorCode = twoFactorCode;
         user.twoFactorCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

         console.log("twoFactorCode", twoFactorCode);

         await user.save();

         // Send 2FA code via email
         await sendTwoFactorCode(email, twoFactorCode);

         res.json({ message: "2FA code sent. Please verify.", requireTwoFactor: true });
      } else {
         // Generate JWT token
         const payload = {
            user: {
               id: user._id,
            },
         };
         const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

         res.json({ message: "Login successful", user, token, requireTwoFactor: false });
      }
   } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.verifyTwoFactorRegistration = async (req, res) => {
   try {
      let { email, code } = req.body;

      // Sanitize email
      email = email.trim().toLowerCase();

      const user = await User.findOne({ email });
      if (!user) {
         return res.status(400).json({ message: "User not found" });
      }

      if (user.twoFactorCode !== code || user.twoFactorCodeExpires < Date.now()) {
         return res.status(400).json({ message: "Invalid or expired code" });
      }

      user.isVerified = true;
      user.twoFactorCode = undefined;
      user.twoFactorCodeExpires = undefined;
      await user.save();

      res.json({ message: "Email verified successfully" });
   } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.verifyTwoFactor = async (req, res) => {
   try {
      let { email, code } = req.body;

      // Sanitize email
      email = email.trim().toLowerCase();
      console.log("email, code", email, code);

      const user = await User.findOne({ email });
      if (!user) {
         return res.status(400).json({ message: "User not found", validation: false });
      }

      console.log("user", user);
      if (user.twoFactorCode !== code || user.twoFactorCodeExpires < Date.now()) {
         return res.status(400).json({ message: "Invalid or expired code", validation: false });
      }

      user.twoFactorCode = undefined;
      user.twoFactorCodeExpires = undefined;
      user.isVerified = true;
      await user.save();

      // Generate JWT token
      const payload = {
         user: {
            id: user._id,
         },
      };

      // Generate JWT
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
      console.log("Login successful, token generated");

      res.json({ token, user, validation: true });
   } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error, Try again later!", validation: false });
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
         .populate("followers", "username email profilePicture title")
         .populate("following", "username email profilePicture title");

      res.json({
         message: "Successfully followed user",
         user: currentUser,
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
         .populate("followers", "username email profilePicture title")
         .populate("following", "username email profilePicture title");

      res.json({
         message: "Successfully unfollowed user",
         user: currentUser,
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

exports.resendTwoFactorCode = async (req, res) => {
   try {
      let { email } = req.body;

      // Sanitize email
      email = email.trim().toLowerCase();

      if (!validator.isEmail(email)) {
         return res.status(400).json({ message: "Invalid email format" });
      }

      const user = await User.findOne({ email });
      if (!user) {
         return res.status(400).json({ message: "User not found" });
      }

      // Generate new 2FA code
      const twoFactorCode = generateTwoFactorCode();
      user.twoFactorCode = twoFactorCode;
      user.twoFactorCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

      await user.save();

      // Send 2FA code via email
      await sendTwoFactorCode(email, twoFactorCode);

      res.json({ message: "New 2FA code sent. Please check your email." });
   } catch (error) {
      console.error("Error resending 2FA code:", error);
      res.status(500).json({ message: "Server error", error: error.toString() });
   }
};
