const mongoose = require("mongoose");
const LearningTask = require("../models/LearningTask");

exports.createLearningTask = async (req, res) => {
   try {
      const {
         taskType,
         taskTitle, // Changed from name to taskTitle
         level,
         progress,
         status,
         timeRemain,
         resourceLinks,
         estimatedTime,
         pages,
         chapters,
         reminders,
         personalGoals,
      } = req.body;

      // Validation
      if (!taskType || !taskTitle || !level || progress === undefined || !status || !timeRemain || !estimatedTime) {
         return res.status(400).json({
            message: "Missing required fields",
            missingFields: {
               taskType: !taskType,
               taskTitle: !taskTitle,
               level: !level,
               progress: progress === undefined,
               status: !status,
               timeRemain: !timeRemain,
               estimatedTime: !estimatedTime,
            },
         });
      }

      if (!["Course", "Book", "Video", "Article"].includes(taskType)) {
         return res.status(400).json({ message: "Invalid task type" });
      }

      if (progress < 0 || progress > 100) {
         return res.status(400).json({ message: "Progress must be between 0 and 100" });
      }

      // Level validation
      if (!["Beginner", "Intermediate", "Advanced"].includes(level)) {
         return res.status(400).json({ message: "Invalid level" });
      }

      // Status validation
      if (!["Not Started", "In Progress", "Completed"].includes(status)) {
         return res.status(400).json({ message: "Invalid status" });
      }

      // Reminders validation
      if (
         !reminders ||
         typeof reminders !== "object" ||
         !("resume" in reminders) ||
         !("deadline" in reminders) ||
         !("every3Hours" in reminders)
      ) {
         return res.status(400).json({ message: "Invalid reminders format" });
      }

      // Create new learning task
      const newTask = new LearningTask({
         user: req.user._id,
         taskType,
         taskTitle, // Changed from name to taskTitle
         level,
         progress,
         status,
         timeRemain,
         lastUpdated: new Date(),
         progressHistory: [],
         milestones: [],
         timeSpent: 0,
         codeSnippets: [],
         resourceLinks: resourceLinks || [],
         peerReviews: [],
         estimatedTime,
         pages,
         chapters,
         reminders,
         personalGoals,
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

exports.updateTaskProgress = async (req, res) => {
   try {
      const { taskId } = req.params;
      const { taskSpecificProgress, notes, codeSnippet, resourceLinks, timeSpent } = req.body;

      const task = await LearningTask.findById(taskId);

      if (!task) {
         return res.status(404).json({ message: "Task not found" });
      }

      // Validate and process taskSpecificProgress based on task type
      let processedTaskSpecificProgress;
      switch (task.taskType) {
         case "Book":
         case "Course":
            if (!Number.isInteger(taskSpecificProgress) || taskSpecificProgress < 0) {
               return res.status(400).json({ message: "Invalid task-specific progress for Book/Course. Expected a non-negative integer." });
            }
            processedTaskSpecificProgress = taskSpecificProgress;
            break;
         case "Video":
            if (typeof taskSpecificProgress !== 'number' || taskSpecificProgress < 0) {
               return res.status(400).json({ message: "Invalid task-specific progress for Video. Expected a non-negative number." });
            }
            processedTaskSpecificProgress = taskSpecificProgress;
            break;
         case "Article":
            if (taskSpecificProgress !== 0 && taskSpecificProgress !== 1) {
               return res.status(400).json({ message: "Invalid task-specific progress for Article. Expected 0 or 1." });
            }
            processedTaskSpecificProgress = taskSpecificProgress;
            break;
         default:
            return res.status(400).json({ message: "Invalid task type" });
      }

      // Ensure totalUnits exists and is a number
      if (typeof task.totalUnits !== 'number' || isNaN(task.totalUnits)) {
         return res.status(400).json({ message: "Task is missing totalUnits or it's invalid" });
      }

      // Calculate overall progress
      const newProgress = calculateOverallProgress(task.taskType, processedTaskSpecificProgress, task.totalUnits);

      // Ensure newProgress is a valid number
      if (isNaN(newProgress)) {
         return res.status(400).json({ message: "Failed to calculate overall progress" });
      }

      // Update task
      task.taskSpecificProgress = processedTaskSpecificProgress;
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

      const updatedTask = await task.save();

      // Format the updated task to match getLearningTasks output
      const formattedTask = {
         id: updatedTask._id.toString(),
         name: updatedTask.taskTitle,
         level: updatedTask.level,
         progress: updatedTask.progress,
         status: updatedTask.status,
         timeRemain: updatedTask.timeRemain,
         lastUpdated: updatedTask.updatedAt.toISOString(),
         progressHistory: updatedTask.progressHistory?.map((ph) => ({
            date: ph.date.toISOString(),
            progress: ph.progress,
         })) || [],
         milestones: updatedTask.milestones?.map((m) => ({
            name: m.title,
            percentage: m.completed ? 100 : 0,
         })) || [],
         timeSpent: updatedTask.timeSpent,
         codeSnippets: updatedTask.codeSnippets.map((cs) => ({
            content: cs.content,
            timestamp: cs.timestamp.toISOString(),
         })),
         resourceLinks: updatedTask.resourceLinks,
         peerReviews: updatedTask.peerReviews?.map((pr) => ({
            reviewer: pr.reviewer,
            comment: pr.comment,
            rating: pr.rating,
         })) || [],
         type: updatedTask.taskType,
         estimatedTime: updatedTask.estimatedTime,
         pages: updatedTask.pages,
         chapters: updatedTask.chapters,
         reminders: updatedTask.reminders ? Object.keys(updatedTask.reminders).filter((key) => updatedTask.reminders[key]) : [],
         personalGoals: updatedTask.personalGoals ? [updatedTask.personalGoals] : [],
         quizResults: updatedTask.quizResults || [],
         notes: updatedTask.notes.map((note) => ({
            content: note.content,
            timestamp: note.timestamp.toISOString(),
         })),
         taskSpecificProgress: updatedTask.taskSpecificProgress,
         totalUnits: updatedTask.totalUnits,
      };

      res.json(formattedTask);
   } catch (error) {
      console.error("Error updating task progress:", error);
      res.status(500).json({ message: "Server error", error: error.toString() });
   }
};

function validateTaskSpecificProgress(taskType, progress) {
   switch (taskType) {
      case "Book":
      case "Course":
         return Number.isInteger(progress) && progress >= 0;
      case "Video":
         return typeof progress === "number" && progress >= 0;
      case "Article":
         return progress === 0 || progress === 1;
      default:
         return false;
   }
}

function calculateOverallProgress(taskType, taskSpecificProgress, totalUnits) {
   switch (taskType) {
      case "Book":
      case "Video":
      case "Course":
         return Math.min(100, Math.round((taskSpecificProgress / totalUnits) * 100));
      case "Article":
         return taskSpecificProgress * 100;
      default:
         return 0;
   }
}
