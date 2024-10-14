const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.register = async (req, res) => {
   try {
      const { username, email, password } = req.body;
      const user = await User.create({ username, email, password });
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
      res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email } });
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.login = async (req, res) => {
   try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
         return res.status(401).json({ message: "Invalid email or password" });
      }
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
      res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};
