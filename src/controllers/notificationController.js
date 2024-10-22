const Notification = require("../models/Notification");

exports.createNotification = async (userId, type, message, relatedJourney = null, relatedUser = null, sharedJourneyId = null) => {
   try {
      const notification = new Notification({
         user: userId,
         type,
         message,
         relatedJourney,
         relatedUser,
         sharedJourneyId,
      });
      await notification.save();
   } catch (error) {
      console.error("Error creating notification:", error);
   }
};

exports.getNotifications = async (req, res) => {
   try {
      const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
      res.json({ notifications, error: false });
   } catch (error) {
      res.status(500).json({ message: error.message, error: true });
   }
};

exports.markNotificationAsRead = async (req, res) => {
   try {
      const { id } = req.params;
      const notification = await Notification.findOneAndUpdate({ _id: id, user: req.user._id }, { read: true }, { new: true });
      if (!notification) {
         return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ notification, error: false });
   } catch (error) {
      res.status(400).json({ message: error.message, error: true });
   }
};

exports.deleteNotification = async (req, res) => {
   try {
      const { id } = req.params;
      const deletedNotification = await Notification.findOneAndDelete({ _id: id, user: req.user._id });
      if (!deletedNotification) {
         return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ message: "Notification deleted successfully", error: false });
   } catch (error) {
      res.status(400).json({ message: error.message, error: true });
   }
};
