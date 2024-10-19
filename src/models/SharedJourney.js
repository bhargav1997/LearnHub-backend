const mongoose = require("mongoose");

const sharedJourneySchema = new mongoose.Schema(
   {
      journey: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "LearningJourney",
         required: true,
      },
      sharedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      sharedWith: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      status: {
         type: String,
         enum: ["pending", "accepted", "rejected"],
         default: "pending",
      },
   },
   { timestamps: true },
);

module.exports = mongoose.model("SharedJourney", sharedJourneySchema);
