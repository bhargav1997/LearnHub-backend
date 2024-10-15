const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
   {
      title: {
         type: String,
         required: true,
         trim: true,
      },
      description: {
         type: String,
         trim: true,
      },
      start: {
         type: Date,
         required: true,
      },
      end: {
         type: Date,
         required: false,
      },
      resourceType: {
         type: String,
         enum: ["link", "video", "book", "article"],
         default: "link",
      },
      resourceLink: {
         type: String,
         trim: true,
      },
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
   },
   {
      timestamps: true,
   },
);

// Index for efficient querying by date range
EventSchema.index({ start: 1, end: 1 });

// Index for efficient querying by user
EventSchema.index({ user: 1 });

// Validation: ensure end date is after start date
EventSchema.pre("save", function (next) {
   if (this.end <= this.start) {
      next(new Error("End date must be after start date"));
   } else {
      next();
   }
});

const Event = mongoose.model("Event", EventSchema);

module.exports = Event;
