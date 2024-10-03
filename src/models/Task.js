const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
   user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
   title: { type: String, required: true },
   source: { type: String, required: true },
   sourceType: { type: String, enum: ["youtube", "book", "course"], required: true },
   estimatedTime: { type: Number, required: true }, // in minutes
   deadline: { type: Date },
   status: { type: String, enum: ["not_started", "in_progress", "paused", "completed"], default: "not_started" },
   progress: { type: Number, default: 0 }, // percentage
   timeSpent: { type: Number, default: 0 }, // in minutes
   notes: [{ type: String }],
   createdAt: { type: Date, default: Date.now },
   updatedAt: { type: Date, default: Date.now },
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
