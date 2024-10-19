const Notification = require("../models/Notification");

exports.createNotification = async (userId, type, message, relatedJourney = null, relatedUser = null, sharedJourneyId = null) => {
   try {
      const notification = new Notification({
         user: userId,
         type,
         message,
         relatedJourney,
         relatedUser,
         sharedJourneyId
      });
      await notification.save();
   } catch (error) {
      console.error("Error creating notification:", error);
   }
};

exports.getNotifications = async (req, res) => {
   try {
      const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
      res.json(notifications);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.markNotificationAsRead = async (req, res) => {
   try {
      const { id } = req.params;
      const notification = await Notification.findOneAndUpdate({ _id: id, user: req.user._id }, { read: true }, { new: true });
      if (!notification) {
         return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};
