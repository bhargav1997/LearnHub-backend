const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
   {
      author: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      title: {
         type: String,
         required: true,
      },
      content: {
         type: String,
         required: true,
      },
      tags: [String],
      image: String,
      category: {
         type: String,
         required: true,
      },
   },
   { timestamps: true },
);

module.exports = mongoose.model("Post", postSchema);
