const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

function initializeChat(io) {
   // Use the io instance passed as an argument
   io.use(async (socket, next) => {
      try {
         const token = socket.handshake.auth.token;
         if (!token) {
            return next(new Error("Authentication error: No token provided"));
         }
         const decoded = jwt.verify(token, process.env.JWT_SECRET);
         console.log("Decoded token:", decoded);
         const user = await User.findById(decoded.user.id).select("-password");
         if (!user) {
            return next(new Error("Authentication error: User not found"));
         }
         socket.user = user;
         next();
      } catch (error) {
         next(new Error(`Authentication error: ${error.message}`));
      }
   });

   io.on("connection", (socket) => {
      console.log(`User connected: ${socket.user.username}`);

      // Join a room (e.g., for private messages or group chats)
      socket.on("join_room", (roomId) => {
         socket.join(roomId);
         console.log(`${socket.user.username} joined room ${roomId}`);
      });

      // Leave a room
      socket.on("leave_room", (roomId) => {
         socket.leave(roomId);
         console.log(`${socket.user.username} left room ${roomId}`);
      });

      // Handle incoming messages
      socket.on("send_message", (data) => {
         const { roomId, message } = data;
         io.to(roomId).emit("receive_message", {
            userId: socket.user._id,
            username: socket.user.username,
            message,
            timestamp: new Date(),
         });
      });

      // Handle private messages
      socket.on("private_message", ({ recipientId, message }) => {
         console.log("Received private message:", { recipientId, message });
         const senderId = socket.user._id.toString();

         // Emit to recipient
         socket.to(recipientId).emit("private_message", {
            senderId,
            senderUsername: socket.user.username,
            message,
            timestamp: new Date(),
         });

         // Emit to sender (so they see their own message)
         socket.emit("private_message", {
            senderId,
            senderUsername: socket.user.username,
            message,
            timestamp: new Date(),
         });
      });

      // Handle user online status
      socket.on("user_online", () => {
         socket.broadcast.emit("user_status", { userId: socket.user._id, status: "online" });
      });

      socket.on("user_offline", () => {
         socket.broadcast.emit("user_status", { userId: socket.user._id, status: "offline" });
      });

      // Handle typing events
      socket.on("typing_start", (roomId) => {
         socket.to(roomId).emit("typing_status", { userId: socket.user._id, status: "typing" });
      });

      socket.on("typing_end", (roomId) => {
         socket.to(roomId).emit("typing_status", { userId: socket.user._id, status: "idle" });
      });

      // Handle disconnection
      socket.on("disconnect", () => {
         console.log(`User disconnected: ${socket.user.username}`);
         // Leave all rooms
         Object.keys(socket.rooms).forEach((room) => {
            if (room !== socket.id) {
               socket.leave(room);
            }
         });
      });
   });
}

module.exports = initializeChat;
