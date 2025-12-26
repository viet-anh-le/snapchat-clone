const chatRoutes = require("./chat.route");
const friendRoutes = require("./friend.route");

module.exports = (app) => {
  app.use("/api/chat", chatRoutes);
  app.use("/api/friends", friendRoutes);
};
