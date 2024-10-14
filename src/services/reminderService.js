const cron = require("node-cron");
const Task = require("../models/Task");
const User = require("../models/User");
require("dotenv").config();

const transporter = require("./mail");

const sendReminder = async (user, task) => {
   const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "LearnHub Task Reminder",
      text: `Don't forget about your task: ${task.title}. It's been 3 days since your last activity.`,
   };

   await transporter.sendMail(mailOptions);
};

const checkInactiveTasks = async () => {
   const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
   const tasks = await Task.find({
      status: { $in: ["not_started", "in_progress"] },
      updatedAt: { $lt: threeDaysAgo },
   }).populate("user");

   for (const task of tasks) {
      await sendReminder(task.user, task);
   }
};

const startReminderService = () => {
   cron.schedule("0 0 * * *", checkInactiveTasks); // Run daily at midnight
};

module.exports = { startReminderService };
