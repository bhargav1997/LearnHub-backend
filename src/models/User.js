const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const workSchema = new mongoose.Schema({
   title: String,
   company: String,
   startDate: String,
   endDate: String,
   description: String,
});

const educationSchema = new mongoose.Schema({
   degree: String,
   school: String,
   graduationYear: String,
});

const userSchema = new mongoose.Schema({
   username: { type: String, required: true, unique: true },
   email: { type: String, required: true, unique: true },
   password: { type: String, required: true },
   role: { type: String, enum: ["student", "instructor", "admin"], default: "student" },
   profilePicture: { type: String },
   title: { type: String },
   location: { type: String },
   bio: { type: String },
   learningGoals: [{ type: String }],
   learningHours: { type: Number, default: 0 },
   coursesCompleted: { type: Number, default: 0 },
   followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
   following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
   work: workSchema,
   education: educationSchema,
   skills: [{ type: String }],
   website: { type: String },
   createdAt: { type: Date, default: Date.now },
   lastActive: { type: Date, default: Date.now },
});

userSchema.virtual("connections").get(function () {
   return (this.followers ? this.followers.length : 0) + (this.following ? this.following.length : 0);
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

userSchema.methods.comparePassword = async function (candidatePassword) {
   return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
