const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
   username: { type: String, required: true, unique: true },
   email: { type: String, required: true, unique: true },
   password: { type: String, required: true },
   role: { type: String, enum: ["student", "instructor", "admin"], default: "student" },
   profilePicture: { type: String },
   bio: { type: String },
   learningGoals: [{ type: String }],
   followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
   following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
   createdAt: { type: Date, default: Date.now },
   lastActive: { type: Date, default: Date.now },
});

// userSchema.pre("save", async function (next) {
//    if (!this.isModified("password")) return next();
//    this.password = await bcrypt.hash(this.password, 12);
//    next();
// });

userSchema.methods.comparePassword = async function (candidatePassword) {
   return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
