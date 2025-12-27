const chatRoutes = require("./chat.route");
const friendRoutes = require("./friend.route");
const authRoutes = require("./auth.route"); // <--- Import file route vừa tạo

module.exports = (app) => {
  app.use("/api/chat", chatRoutes);
  app.use("/api/friends", friendRoutes);
  
  // Mount auth routes vào đường dẫn /api/auth
  app.use("/api/auth", authRoutes); 
};