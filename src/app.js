const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const userRoutes = require("./routes/userRouter");
const taskRoutes = require("./routes/taskRouter");
const eventRoutes = require("./routes/eventRouter");
const chatRoutes = require("./routes/chatRouter");
const learningJourneyRoutes = require("./routes/learningJourneyRouter");
const notificationRoutes = require("./routes/notificationRouter");
const postRoutes = require("./routes/postRouter");

const cors = require("cors");
const reminderService = require("./services/reminderService");
const initializeChat = require("./services/chatService");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

const corsOptions = {
   origin: process.env.ORIGIN,
   optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Increase the limit here
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware
app.use(cors(corsOptions));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Initialize Socket.IO
const io = new Server(server, {
   cors: corsOptions,
});

// Make io accessible to our routers
app.set("io", io);

// Initialize chat service
initializeChat(io);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/learning-journeys", learningJourneyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/posts", postRoutes);

// Socket.IO connection handling
io.on("connection", (socket) => {
   console.log("New client connected");

   socket.on("join room", (roomId) => {
      socket.join(roomId);
      console.log(`User joined room ${roomId}`);
   });

   socket.on("leave room", (roomId) => {
      socket.leave(roomId);
      console.log(`User left room ${roomId}`);
   });

   socket.on("chat message", (msg) => {
      io.to(msg.roomId).emit("chat message", msg);
   });

   socket.on("disconnect", () => {
      console.log("Client disconnected");
   });
});

// Start reminder service
reminderService.startReminderService();

// Error handling middleware
app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).send("Something broke!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server, io };
