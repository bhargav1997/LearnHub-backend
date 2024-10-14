const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();
function initializeChat(server) {
   const io = socketIo(server, {
      cors: {
         origin: process.env.ORIGIN, // Replace with your frontend URL
         methods: ["GET", "POST"],
      },
   });

   // Middleware to authenticate socket connections
   io.use(async (socket, next) => {
      try {
         const token = socket.handshake.auth.token;
         const decoded = jwt.verify(token, process.env.JWT_SECRET);
         const user = await User.findById(decoded.userId).select("-password");
         if (!user) {
            return next(new Error("Authentication error"));
         }
         socket.user = user;
         next();
      } catch (error) {
         next(new Error("Authentication error"));
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
      });
   });

   return io;
}

module.exports = initializeChat;
