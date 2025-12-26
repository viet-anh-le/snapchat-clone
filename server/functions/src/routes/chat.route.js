const express = require("express");
const router = express.Router();

const controller = require("../controllers/chatController");

router.post("/create-group", controller.createGroup);

module.exports = router;
