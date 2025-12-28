const express = require("express");
const router = express.Router();

const controller = require("../controllers/chatController");

router.post("/create-group", controller.createGroup);
router.post("/react", controller.reactToMessage);

module.exports = router;
