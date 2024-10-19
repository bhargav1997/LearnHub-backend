const LearningJourney = require("../models/LearningJourney");
const Notification = require("../models/Notification");
const SharedJourney = require("../models/SharedJourney");
const User = require("../models/User");
const NotificationController = require("./notificationController");

exports.createLearningJourney = async (req, res) => {
   try {
      const { name, description, resources, tasks, steps, notes } = req.body;
      const newJourney = new LearningJourney({
         user: req.user._id,
         name,
         description,
         resources,
         tasks,
         steps,
         notes,
      });
      const savedJourney = await newJourney.save();
      res.status(201).json(savedJourney);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.updateLearningJourney = async (req, res) => {
   try {
      const { id } = req.params;
      const { name, description, resources, tasks, steps, notes } = req.body;
      const updatedJourney = await LearningJourney.findOneAndUpdate(
         { _id: id, user: req.user._id },
         { name, description, resources, tasks, steps, notes },
         { new: true },
      );
      if (!updatedJourney) {
         return res.status(404).json({ message: "Learning journey not found" });
      }
      res.json(updatedJourney);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.deleteLearningJourney = async (req, res) => {
   try {
      const { id } = req.params;
      const deletedJourney = await LearningJourney.findOneAndDelete({ _id: id, user: req.user._id });
      if (!deletedJourney) {
         return res.status(404).json({ message: "Learning journey not found" });
      }
      res.json({ message: "Learning journey deleted successfully" });
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.getLearningJourney = async (req, res) => {
   try {
      const { id } = req.params;
      const journey = await LearningJourney.findOne({ _id: id, user: req.user._id });
      if (!journey) {
         return res.status(404).json({ message: "Learning journey not found" });
      }
      res.json(journey);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.getAllLearningJourneys = async (req, res) => {
   try {
      const journeys = await LearningJourney.find({ user: req.user._id });
      res.json(journeys);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.deleteResource = async (req, res) => {
   try {
      const { journeyId, resourceId } = req.params;

      const journey = await LearningJourney.findOne({ _id: journeyId, user: req.user._id });

      if (!journey) {
         return res.status(404).json({ message: "Learning journey not found", error: true });
      }

      // Find the resource to be deleted
      const resourceToDelete = journey.resources.find(resource => resource._id.toString() === resourceId);

      if (!resourceToDelete) {
         return res.status(404).json({ message: "Resource not found", error: true });
      }

      // Remove the resource
      journey.resources = journey.resources.filter((resource) => resource._id.toString() !== resourceId);

      // Remove the resource from steps
      journey.steps = journey.steps.filter((step) => !step.includes(resourceToDelete.url));

      const updatedJourney = await journey.save();

      res.json(updatedJourney);
   } catch (error) {
      res.status(400).json({ message: error.message, error: true });
   }
};

exports.deleteTask = async (req, res) => {
   try {
      const { journeyId, taskId } = req.params;

      const journey = await LearningJourney.findOne({ _id: journeyId, user: req.user._id });

      if (!journey) {
         return res.status(404).json({ message: "Learning journey not found", error: true });
      }

      // Remove the task
      journey.tasks = journey.tasks.filter((task) => task._id.toString() !== taskId);

      // // Remove the task from steps
      // journey.steps = journey.steps.filter((step) => step !== taskId);

      const updatedJourney = await journey.save();

      res.json(updatedJourney);
   } catch (error) {
      res.status(400).json({ message: error.message, error: true });
   }
};

exports.shareJourney = async (req, res) => {
   try {
      const { id } = req.params;
      const { email } = req.body;

      const journey = await LearningJourney.findOne({ _id: id, user: req.user._id });
      if (!journey) {
         return res.status(404).json({ message: "Learning journey not found", error: true });
      }

      const sharedWithUser = await User.findOne({ email });
      if (!sharedWithUser) {
         return res.status(404).json({ message: "User not found", error: true });
      }

      const sharedJourney = new SharedJourney({
         journey: journey._id,
         sharedBy: req.user._id,
         sharedWith: sharedWithUser._id
      });

      await sharedJourney.save();

      // Send notification with sharedJourneyId
      await NotificationController.createNotification(
         sharedWithUser._id, 
         'journey_shared', 
         `${req.user.username} shared a learning journey with you.`,
         journey._id,
         req.user._id,
         sharedJourney._id
      );

      res.json({ message: "Journey shared successfully", error: false });
   } catch (error) {
      res.status(400).json({ message: error.message, error: true });
   }
};

exports.getSharedJourneys = async (req, res) => {
   try {
      const sharedJourneys = await SharedJourney.find({ sharedWith: req.user._id })
         .populate('journey')
         .populate('sharedBy', 'username email');
      res.json(sharedJourneys);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.respondToSharedJourney = async (req, res) => {
   try {
      const { id } = req.params;
      const { response } = req.body;

      const sharedJourney = await SharedJourney.findOne({ _id: id, sharedWith: req.user._id });
      if (!sharedJourney) {
         return res.status(404).json({ message: "Shared journey not found" });
      }

      sharedJourney.status = response === 'accept' ? 'accepted' : 'rejected';
      await sharedJourney.save();

      if (response === 'accept') {
         const originalJourney = await LearningJourney.findById(sharedJourney.journey);
         
         // Reset completion status for resources and tasks
         const resetResources = originalJourney.resources.map(resource => ({
            ...resource.toObject(),
            completed: false
         }));

         const resetTasks = originalJourney.tasks.map(task => ({
            ...task.toObject(),
            completed: false
         }));

         // Create a new journey for the accepting user
         const newJourney = new LearningJourney({
            user: req.user._id,
            name: originalJourney.name,
            description: originalJourney.description,
            resources: resetResources,
            tasks: resetTasks,
            steps: originalJourney.steps,
            notes: originalJourney.notes,
            sharedFrom: originalJourney._id
         });

         await newJourney.save();

         // Optionally, you can still add the accepting user to the original journey's sharedWith array
         originalJourney.sharedWith.push(req.user._id);
         await originalJourney.save();
      }

      // Remove the notification for the user who accepted/rejected the journey
      await Notification.findOneAndDelete({
         user: req.user._id,
         type: 'journey_shared',
         sharedJourneyId: sharedJourney._id
      });

      // Send notification to the user who shared the journey
      await NotificationController.createNotification(
         sharedJourney.sharedBy, 
         'journey_share_response', 
         `${req.user.username} ${response === 'accept' ? 'accepted' : 'rejected'} your shared journey.`,
         sharedJourney.journey,
         req.user._id,
         sharedJourney._id
      );

      if (response === 'reject') {
         await SharedJourney.findByIdAndDelete(id);
      }

      res.json({ message: `Journey ${response === 'accept' ? 'accepted' : 'rejected'} successfully` });
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};
