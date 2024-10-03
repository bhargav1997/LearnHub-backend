const Message = require("../models/Chat");

exports.getMessages = async (req, res) => {
   try {
      const { roomId } = req.params;
      const messages = await Message.find({ roomId })
         .sort({ timestamp: 1 })
         .populate("sender", "username")
         .populate("receiver", "username");
      res.json(messages);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};

exports.sendMessage = async (req, res) => {
   try {
      const { receiverId, content, roomId } = req.body;
      const senderId = req.user.id;

      // Check if users are connected (following each other)
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);

      if (!sender.following.includes(receiverId) || !receiver.followers.includes(senderId)) {
         return res.status(403).json({ message: "You can only send messages to your connections" });
      }

      const message = new Message({
         sender: senderId,
         receiver: receiverId,
         content,
         roomId,
      });
      await message.save();
      res.status(201).json(message);
   } catch (error) {
      res.status(400).json({ message: error.message });
   }
};

exports.getRecentChats = async (req, res) => {
   try {
      const userId = req.user.id;
      const recentChats = await Message.aggregate([
         { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
         { $sort: { timestamp: -1 } },
         { $group: { _id: { $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"] }, lastMessage: { $first: "$$ROOT" } } },
         { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
         { $unwind: "$user" },
         { $project: { "user.password": 0 } },
      ]);
      res.json(recentChats);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
};
