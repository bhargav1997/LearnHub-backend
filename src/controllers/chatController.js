// const Message = require("../models/Chat");
const Chat = require("../models/Chat");
const mongoose = require("mongoose");

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

exports.getChatHistory = async (req, res) => {
   try {
      const { recipientId } = req.params;
      console.log("te", recipientId);
      const userId = req.user._id;

      console.log("Fetching chat history for users:", userId, recipientId);

      const messages = await Chat.find({
         $or: [
            { sender: userId, recipient: recipientId },
            { sender: recipientId, recipient: userId },
         ],
      })
         .sort("timestamp")
         .populate("sender", "username");

      console.log("Found messages:", messages);
      res.json(messages);
   } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Error fetching chat history", error: error.toString(), stack: error.stack });
   }
};

exports.sendMessage = async (req, res) => {
   try {
      const { roomId, message } = req.body;
      const newMessage = new Chat({
         roomId,
         sender: req.user._id,
         message,
      });
      await newMessage.save();

      const io = req.app.get("io");
      if (!io) {
         throw new Error("Socket.IO instance not found");
      }

      // Emit the message to all users in the room
      io.to(roomId).emit("chat message", {
         sender: req.user.username,
         message,
         timestamp: newMessage.timestamp,
      });

      res.status(201).json(newMessage);
   } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Error sending message", error: error.message });
   }
};

exports.sendPrivateMessage = async (req, res) => {
   try {
      const { recipientId, message } = req.body;
      const senderId = req.user._id;

      const newMessage = new Chat({
         sender: senderId,
         recipient: recipientId,
         message,
      });
      await newMessage.save();

      const io = req.app.get("io");
      if (!io) {
         throw new Error("Socket.IO instance not found");
      }

      // Emit to recipient
      io.to(recipientId).emit("private_message", {
         senderId: senderId.toString(),
         senderUsername: req.user.username,
         message,
         timestamp: newMessage.timestamp,
      });

      res.status(201).json(newMessage);
   } catch (error) {
      console.error("Error sending private message:", error);
      res.status(500).json({ message: "Error sending private message", error: error.message });
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

exports.clearPrivateChat = async (req, res) => {
   try {
      const userId = req.user.id;
      const recipientId = req.params.recipientId;

      // Validate that recipientId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
         return res.status(400).json({ message: "Invalid recipient ID", error: true });
      }

      console.log(`Attempting to clear chat between ${userId} and ${recipientId}`);

      const result = await Chat.deleteMany({
         $or: [
            { sender: userId, recipient: recipientId },
            { sender: recipientId, recipient: userId },
         ],
      });

      console.log(`Deletion result:`, result);

      if (result.deletedCount > 0) {
         res.json({ message: `Private chat cleared successfully. Deleted ${result.deletedCount} messages.`, error: false });
      } else {
         res.json({ message: "No messages found to delete", error: false });
      }
   } catch (error) {
      console.error("Error clearing private chat:", error);
      res.status(500).json({ message: "Server error", error: true });
   }
};
