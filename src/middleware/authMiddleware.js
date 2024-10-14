const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Import your User model
require("dotenv").config();

module.exports = async (req, res, next) => {
   console.log("Auth middleware reached");
   try {
      const token = req.header("Authorization")?.replace("Bearer ", "");
      
      if (!token) {
         throw new Error("No token provided");
      }

      // console.log("Token received:", token);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // console.log("Decoded token:", decoded);

      const userId = decoded.id || (decoded.user && decoded.user.id);

      if (!userId) {
         throw new Error("No user ID found in token");
      }

      // console.log("User ID from token:", userId);

      const user = await User.findById(userId).select("-password");
      
      if (!user) {
         throw new Error("User not found");
      }
      
      req.user = user;
      // console.log("User set in req:", req.user);
      next();
   } catch (error) {
      console.error("Auth middleware error:", error.message);
      return res.status(401).json({ message: "Authentication failed", error: error.message });
   }
};
