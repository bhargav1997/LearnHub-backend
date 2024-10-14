const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRouter");
const taskRoutes = require("./routes/taskRouter");
const chatRoutes = require("./routes/chatRouter");
const cors = require("cors");

const reminderService = require("./services/reminderService");
const initializeChat = require("./services/chatService");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.ORIGIN }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/chat", chatRoutes);

// Initialize chat
const io = initializeChat(server);

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
