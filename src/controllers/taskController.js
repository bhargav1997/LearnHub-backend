const Task = require("../models/Task");

exports.createTask = async (req, res) => {
   try {
      const { title, source, sourceType, estimatedTime, deadline } = req.body;
      const task = await Task.create({
         user: req.user.id,
         title,
         source,
         sourceType,
         estimatedTime,
         deadline,
      });
      res.status(201).json(task);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.getTasks = async (req, res) => {
   try {
      const tasks = await Task.find({ user: req.user.id });
      res.json(tasks);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.getTask = async (req, res) => {
   try {
      const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
      if (!task) {
         return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.updateTask = async (req, res) => {
   try {
      const { title, source, sourceType, estimatedTime, deadline, status, progress, timeSpent, notes } = req.body;
      const task = await Task.findOneAndUpdate(
         { _id: req.params.id, user: req.user.id },
         { title, source, sourceType, estimatedTime, deadline, status, progress, timeSpent, notes, updatedAt: Date.now() },
         { new: true },
      );
      if (!task) {
         return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.deleteTask = async (req, res) => {
   try {
      const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
      if (!task) {
         return res.status(404).json({ message: "Task not found" });
      }
      res.json({ message: "Task deleted successfully" });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};
