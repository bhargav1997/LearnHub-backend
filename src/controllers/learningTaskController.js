const LearningTask = require("../models/LearningTask");
const UserStatsService = require("../services/UserStatsService");

exports.createLearningTask = async (req, res) => {
   try {
      const { taskType, taskTitle, resourceLinks, timeRemain, reminders, personalGoals, progress, pages, chapters, estimatedTime, status } =
         req.body;

      // Validation
      if (!taskType || !taskTitle || !resourceLinks || !timeRemain || !reminders || progress === undefined || !status) {
         return res.status(400).json({
            message: "Missing required fields",
            missingFields: {
               taskType: !taskType,
               taskTitle: !taskTitle,
               resourceLinks: !resourceLinks,
               timeRemain: !timeRemain,
               reminders: !reminders,
               progress: progress === undefined,
               status: !status,
            },
         });
      }

      if (!["Course", "Book", "Video", "Article"].includes(taskType)) {
         return res.status(400).json({ message: "Invalid task type" });
      }

      if (progress < 0 || progress > 100) {
         return res.status(400).json({ message: "Initial progress must be between 0 and 100" });
      }

      // Create new learning task
      const newTask = new LearningTask({
         user: req.user._id,
         taskType,
         taskTitle,
         resourceLinks,
         timeRemain,
         reminders,
         personalGoals,
         progress,
         pages,
         chapters,
         estimatedTime,
         status,
         lastUpdated: new Date(),
         progressHistory: [{ date: new Date(), progress: progress }],
         timeSpent: 0,
         codeSnippets: [],
         resourceLinks: [],
         totalUnits: taskType === "Book" ? pages : taskType === "Course" ? chapters : 1,
      });

      // Save the task
      const savedTask = await newTask.save();

      res.status(201).json(savedTask);
   } catch (error) {
      console.error("Error creating learning task:", error);
      res.status(500).json({ message: "Server error" });
   }
};

exports.getLearningTasks = async (req, res) => {
   console.log("getLearningTasks function called", req.user.id);
   try {
      // console.log("User from req:", req.user);
      if (!req.user || !req.user.id) {
         return res.status(401).json({ message: "User not authenticated" });
      }
      const userId = req.user.id.toString();
      console.log("User ID for query:", userId);

      const learningTasks = await LearningTask.find({ user: req.user.id });

      console.log("Found learning tasks:", learningTasks.length);

      const formattedTasks = learningTasks.map((task) => ({
         id: task._id.toString(),
         name: task.taskTitle,
         level: task.level,
         progress: task.progress,
         status: task.status,
         timeRemain: task.timeRemain,
         lastUpdated: task.updatedAt.toISOString(),
         progressHistory:
            task.progressHistory?.map((ph) => ({
               date: ph.date.toISOString(),
               progress: ph.progress,
            })) || [],
         milestones:
            task.milestones?.map((m) => ({
               name: m.title,
               percentage: m.completed ? 100 : 0,
            })) || [],
         timeSpent: task.timeSpent,
         codeSnippets: task.codeSnippets.map((cs) => ({
            content: cs.content,
            timestamp: cs.timestamp.toISOString(),
         })),
         resourceLinks: task.resourceLinks,
         peerReviews:
            task.peerReviews?.map((pr) => ({
               reviewer: pr.reviewer,
               comment: pr.comment,
               rating: pr.rating,
            })) || [],
         type: task.taskType,
         estimatedTime: task.estimatedTime,
         pages: task.pages,
         chapters: task.chapters,
         reminders: task.reminders ? Object.keys(task.reminders).filter((key) => task.reminders[key]) : [],
         personalGoals: task.personalGoals ? [task.personalGoals] : [],
         quizResults: task.quizResults || [],
         notes: task.notes.map((note) => ({
            content: note.content,
            timestamp: note.timestamp.toISOString(),
         })),
         taskSpecificProgress: task.taskSpecificProgress,
         totalUnits: task.totalUnits,
      }));

      res.json(formattedTasks);
   } catch (error) {
      console.error("Error in getLearningTasks:", error);
      res.status(500).json({ message: "Server error", error: error.toString(), stack: error.stack });
   }
};

// Add a new function to get user stats
exports.getUserStats = async (req, res) => {
   try {
      const userStats = await UserStatsService.getUserStats(req.user._id);
      res.json(userStats);
   } catch (error) {
      console.error("Error getting user stats:", error);
      res.status(500).json({ message: "Server error", error: error.toString() });
   }
};

exports.updateTaskProgress = async (req, res) => {
   try {
      const { taskId } = req.params;
      const { notes, codeSnippet, resourceLinks, timeSpent, pagesRead, minutesWatched, paragraphsRead, lessonsCompleted, completed } =
         req.body;

      const task = await LearningTask.findById(taskId);

      if (!task) {
         return res.status(404).json({ message: "Task not found" });
      }

      let taskSpecificProgress = 0;
      let previousProgress = task.taskSpecificProgress || 0;

      switch (task.taskType) {
         case "Book":
            if (pagesRead !== undefined) {
               taskSpecificProgress = pagesRead;
               task.taskSpecificProgress = (task.taskSpecificProgress || 0) + taskSpecificProgress;
            }
            break;
         case "Video":
            if (minutesWatched !== undefined) {
               taskSpecificProgress = minutesWatched;
               task.taskSpecificProgress = taskSpecificProgress;
            }
            break;
         case "Article":
            if (completed !== undefined) {
               taskSpecificProgress = completed ? 1 : 0;
               task.taskSpecificProgress = taskSpecificProgress;
            }
            break;
         case "Course":
            if (lessonsCompleted !== undefined) {
               taskSpecificProgress = lessonsCompleted;
               task.taskSpecificProgress = taskSpecificProgress;
            }
            break;
         default:
            return res.status(400).json({ message: "Invalid task type" });
      }

      // Calculate overall progress
      const newProgress = calculateOverallProgress(
         task.taskType,
         taskSpecificProgress,
         task.totalUnits,
         previousProgress,
         task.estimatedTime,
      );

      // Update task
      task.progress = newProgress;
      task.timeSpent += timeSpent || 0;

      if (notes) {
         task.notes.push({ content: notes, timestamp: new Date() });
      }

      if (codeSnippet) {
         task.codeSnippets.push({ content: codeSnippet, timestamp: new Date() });
      }

      if (resourceLinks && resourceLinks.length > 0) {
         task.resourceLinks = [...new Set([...task.resourceLinks, ...resourceLinks])];
      }

      // Update progress history
      task.progressHistory.push({
         date: new Date(),
         progress: newProgress,
         timeSpent: timeSpent || 0,
         taskSpecificProgress: task.taskSpecificProgress,
         notes: notes ? [{ content: notes, timestamp: new Date() }] : [],
         codeSnippets: codeSnippet ? [{ content: codeSnippet, timestamp: new Date() }] : [],
      });

      // Update timeRemain
      const totalTimeSpent = task.timeSpent;
      const remainingTime = Math.max(0, task.estimatedTime - totalTimeSpent);
      task.timeRemain = formatTimeRemain(remainingTime);

      const updatedTask = await task.save();

      // Update user stats
      await UserStatsService.updateLearningTime(req.user._id, timeSpent);
      await UserStatsService.updateStreak(req.user._id);
      await UserStatsService.updateTopSkills(req.user._id, task.taskTitle);

      if (newProgress === 100) {
         await UserStatsService.incrementTasksCompleted(req.user._id);
         await UserStatsService.incrementLearningTasksCompleted(req.user._id);
      }

      // Format the updated task to match getLearningTasks output
      const formattedTask = {
         id: updatedTask._id.toString(),
         name: updatedTask.taskTitle,
         progress: updatedTask.progress,
         lastUpdated: updatedTask.updatedAt.toISOString(),
         progressHistory: updatedTask.progressHistory.map((ph) => ({
            date: ph.date.toISOString(),
            progress: ph.progress,
            timeSpent: ph.timeSpent,
            taskSpecificProgress: ph.taskSpecificProgress,
            notes: ph.notes,
            codeSnippets: ph.codeSnippets,
         })),
         timeSpent: updatedTask.timeSpent,
         codeSnippets: updatedTask.codeSnippets.map((cs) => ({
            content: cs.content,
            timestamp: cs.timestamp.toISOString(),
         })),
         resourceLinks: updatedTask.resourceLinks,
         type: updatedTask.taskType,
         estimatedTime: updatedTask.estimatedTime,
         pages: updatedTask.pages,
         chapters: updatedTask.chapters,
         notes: updatedTask.notes.map((note) => ({
            content: note.content,
            timestamp: note.timestamp.toISOString(),
         })),
         taskSpecificProgress: updatedTask.taskSpecificProgress,
         totalUnits: updatedTask.totalUnits,
         timeRemain: updatedTask.timeRemain,
      };

      res.json(formattedTask);
   } catch (error) {
      console.error("Error updating task progress:", error);
      res.status(500).json({ message: "Server error", error: error.toString() });
   }
};

function calculateOverallProgress(taskType, taskSpecificProgress, totalUnits, previousProgress, estimatedTime) {
   switch (taskType) {
      case "Book":
         const totalPagesRead = previousProgress + taskSpecificProgress;
         return totalUnits ? Math.min(100, Math.round((totalPagesRead / totalUnits) * 100)) : 0;
      case "Video":
         return totalUnits ? Math.min(100, Math.round((taskSpecificProgress / totalUnits) * 100)) : 0;
      case "Course":
         // For courses, use estimatedTime instead of totalUnits
         return estimatedTime ? Math.min(100, Math.round((taskSpecificProgress / estimatedTime) * 100)) : 0;
      case "Article":
         return taskSpecificProgress ? 100 : 0;
      default:
         return 0;
   }
}

function formatTimeRemain(minutes) {
   const days = Math.floor(minutes / (24 * 60));
   const hours = Math.floor((minutes % (24 * 60)) / 60);
   const remainingMinutes = minutes % 60;

   if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""}`;
   } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
   } else {
      return `${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
   }
}

exports.deleteLearningTask = async (req, res) => {
   try {
      const { taskId } = req.params;

      // Find the task and ensure it belongs to the current user
      const task = await LearningTask.findOne({ _id: taskId, user: req.user._id });

      if (!task) {
         return res.status(404).json({ message: "Task not found or you don't have permission to delete it" });
      }

      // Delete the task
      await LearningTask.findByIdAndDelete(taskId);

      // Update user stats only if the task was completed
      if (task.progress === 100) {
         await UserStatsService.decrementTotalTasks(req.user._id);
      }

      res.json({ message: "Task deleted successfully" });
   } catch (error) {
      console.error("Error deleting learning task:", error);
      res.status(500).json({ message: "Server error", error: error.toString() });
   }
};
