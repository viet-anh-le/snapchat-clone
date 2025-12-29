const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const socketInit = require("./socket");

const app = express();
const server = http.createServer(app);

// CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || [
      "http://localhost:5173",
      "https://snapchat-clone-1mfv.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Socket.io connection handler
socketInit(io);
app.set("socketio", io);

// ========== REST API ROUTES ==========

// Health check (no auth required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Import routes and middleware
const {
  validateFirebaseIdToken,
} = require("./functions/src/middleware/auth.middleware");
const indexRoutes = require("./functions/src/routes/index.route");

// Apply auth middleware to all API routes
app.use("/api", validateFirebaseIdToken);

indexRoutes(app);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

module.exports = { app, server, io };
