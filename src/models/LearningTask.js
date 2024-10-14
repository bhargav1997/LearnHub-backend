const mongoose = require("mongoose");

const learningTaskSchema = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      taskType: {
         type: String,
         enum: ["Book", "Video", "Course", "Article"],
         required: true,
      },
      taskTitle: {
         type: String,
         required: true,
      },
      totalUnits: {
         type: Number,
         required: true,
      },
      progress: {
         type: Number,
         default: 0,
         min: 0,
         max: 100,
      },
      taskSpecificProgress: {
         type: Number,
         default: 0,
      },
      notes: [{
         content: String,
         timestamp: {
            type: Date,
            default: Date.now,
         },
      }],
      codeSnippets: [{
         content: String,
         timestamp: {
            type: Date,
            default: Date.now,
         },
      }],
      resourceLinks: [String],
      timeSpent: {
         type: Number,
         default: 0,
      },
      status: {
         type: String,
         enum: ["Not Started", "In Progress", "Completed"],
         required: true,
      },
      timeRemain: {
         type: String,
         required: true,
      },
      lastUpdated: {
         type: Date,
         default: Date.now,
      },
      progressHistory: [{
         date: Date,
         progress: Number,
      }],
      milestones: [{
         title: String,
         completed: Boolean,
      }],
      reminders: {
         resume: Boolean,
         deadline: Boolean,
         every3Hours: Boolean,
      },
      personalGoals: String,
   },
   { timestamps: true },
);

module.exports = mongoose.model("LearningTask", learningTaskSchema);
