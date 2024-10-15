const UserStats = require("../models/UserStats");
const LearningTask = require("../models/LearningTask");
const User = require("../models/User");

class UserStatsService {
   static async getOrCreateUserStats(userId) {
      let userStats = await UserStats.findOne({ user: userId });
      if (!userStats) {
         userStats = new UserStats({ user: userId });
         await userStats.save();
      }
      return userStats;
   }

   static async updateLearningTime(userId, timeSpent) {
      const userStats = await this.getOrCreateUserStats(userId);
      userStats.totalLearningTime += timeSpent;
      await userStats.save();
   }

   static async incrementTasksCompleted(userId) {
      const userStats = await this.getOrCreateUserStats(userId);
      userStats.tasksCompleted += 1;
      await userStats.save();
   }

   static async updateStreak(userId) {
      const userStats = await this.getOrCreateUserStats(userId);
      const today = new Date().setHours(0, 0, 0, 0);
      const lastActivityDate = userStats.lastActivityDate ? userStats.lastActivityDate.setHours(0, 0, 0, 0) : null;

      if (lastActivityDate === today) {
         // Already updated today, no need to do anything
         return;
      }

      if (lastActivityDate === new Date(today - 86400000).getTime()) {
         // Yesterday, increment streak
         userStats.currentStreak += 1;
      } else {
         // Streak broken, reset to 1
         userStats.currentStreak = 1;
      }

      userStats.longestStreak = Math.max(userStats.longestStreak, userStats.currentStreak);
      userStats.lastActivityDate = today;
      await userStats.save();
   }

   static async updateTopSkills(userId, skill) {
      const userStats = await this.getOrCreateUserStats(userId);
      const skillIndex = userStats.topSkills.findIndex((s) => s.skill === skill);
      if (skillIndex > -1) {
         userStats.topSkills[skillIndex].count += 1;
      } else {
         userStats.topSkills.push({ skill, count: 1 });
      }
      userStats.topSkills.sort((a, b) => b.count - a.count);
      userStats.topSkills = userStats.topSkills.slice(0, 5); // Keep only top 5 skills
      await userStats.save();
   }

   static async incrementLearningTasksCompleted(userId) {
      const userStats = await this.getOrCreateUserStats(userId);
      userStats.learningTasksCompleted += 1;
      await userStats.save();
   }

   static async getUserStats(userId) {
      const userStats = await this.getOrCreateUserStats(userId);
      const user = await User.findById(userId);

      // If user has mentioned skills in their profile, use those
      if (user.skills && user.skills.length > 0) {
         userStats.topSkills = user.skills.map((skill) => ({ skill, count: 1 }));
      } else {
         // Otherwise, get skills from learning tasks
         const learningTasks = await LearningTask.find({ user: userId });
         const skillCounts = {};
         learningTasks.forEach((task) => {
            if (!skillCounts[task.taskTitle]) {
               skillCounts[task.taskTitle] = 0;
            }
            skillCounts[task.taskTitle] += 1;
         });
         userStats.topSkills = Object.entries(skillCounts)
            .map(([skill, count]) => ({ skill, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
      }

      await userStats.save();
      return userStats;
   }
}

module.exports = UserStatsService;
