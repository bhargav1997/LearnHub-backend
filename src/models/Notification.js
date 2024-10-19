const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      type: {
         type: String,
         enum: ["journey_shared", "journey_share_response", "other"],
         required: true,
      },
      message: {
         type: String,
         required: true,
      },
      read: {
         type: Boolean,
         default: false,
      },
      relatedJourney: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "LearningJourney",
      },
      relatedUser: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
      },
      sharedJourneyId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "SharedJourney",
      },
   },
   { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
