const mongoose = require("mongoose");

const userStatsSchema = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
         unique: true,
      },
      totalLearningTime: {
         type: Number,
         default: 0,
      },
      tasksCompleted: {
         type: Number,
         default: 0,
      },
      currentStreak: {
         type: Number,
         default: 0,
      },
      longestStreak: {
         type: Number,
         default: 0,
      },
      lastActivityDate: {
         type: Date,
         default: null,
      },
      topSkills: [
         {
            skill: String,
            count: Number,
         },
      ],
      learningTasksCompleted: {
         type: Number,
         default: 0,
      },
   },
   { timestamps: true },
);

module.exports = mongoose.model("UserStats", userStatsSchema);
