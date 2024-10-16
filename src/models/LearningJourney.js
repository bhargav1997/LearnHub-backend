const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
   url: String,
   type: String,
   completed: {
      type: Boolean,
      default: false,
   },
});

const taskSchema = new mongoose.Schema({
   text: String,
   completed: {
      type: Boolean,
      default: false,
   },
});

const learningJourneySchema = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      name: {
         type: String,
         required: true,
      },
      description: String,
      resources: [resourceSchema],
      tasks: [taskSchema],
      steps: [String],
      notes: String,
   },
   { timestamps: true },
);

module.exports = mongoose.model("LearningJourney", learningJourneySchema);
