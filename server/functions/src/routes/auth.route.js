const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Định nghĩa các route
router.post("/send-otp", authController.sendOTP);
router.post("/reset-password", authController.resetPassword);

module.exports = router;