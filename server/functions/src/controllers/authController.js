const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");

// Đảm bảo db đã khởi tạo
const db = admin.firestore();

// Cấu hình Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// --- 1. GỬI OTP (Giữ nguyên logic của bạn, chỉ chuẩn hóa log) ---
exports.sendOTP = async (req, res) => {
  try {
    const email = (req.user && req.user.email) || req.body.email;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Tạo OTP
    const otp = otpGenerator.generate(6, { 
      upperCaseAlphabets: false, 
      specialChars: false, 
      lowerCaseAlphabets: false 
    });

    // Hash OTP
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // Lưu vào Firestore: Collection 'otps' - Key là 'email'
    await db.collection('otps').doc(email).set({
      otp: hashedOtp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: Date.now() + 60 * 1000 // 60s hết hạn
    });

    // Gửi Email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Mã xác thực OTP",
        html: `<p>Mã OTP của bạn là: <b style="font-size: 24px">${otp}</b></p>`
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`>>> OTP SENT TO ${email}: ${otp}`); 

    return res.status(200).json({ message: "OTP sent successfully" });

  } catch (error) {
    console.error("Error in sendOTP:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// --- 2. XÁC THỰC OTP & ĐỔI MẬT KHẨU (Khớp với Frontend gọi /reset-password) ---
exports.resetPassword = async (req, res) => {
  // Frontend gửi: { email, otp, newPassword }
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Thiếu thông tin (email, otp, password)" });
  }

  try {
    // A. Lấy mã OTP đã lưu trong DB theo Email
    const otpDoc = await db.collection("otps").doc(email).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: "Mã OTP không tồn tại hoặc đã hết hạn." });
    }

    const otpData = otpDoc.data();

    // B. Kiểm tra hết hạn
    if (Date.now() > otpData.expiresAt) {
      return res.status(400).json({ message: "Mã OTP đã hết hạn." });
    }

    // C. So sánh mã OTP (Bcrypt Compare)
    const isValid = await bcrypt.compare(otp, otpData.otp);
    if (!isValid) {
      return res.status(400).json({ message: "Mã OTP không chính xác." });
    }

    // D. Đổi mật khẩu trong Firebase Auth
    // D1. Lấy user từ email để có UID
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // D2. Update password
    await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
    });

    // E. Xóa OTP sau khi thành công để không dùng lại được
    await db.collection("otps").doc(email).delete();

    return res.status(200).json({ message: "Đổi mật khẩu thành công!" });

  } catch (error) {
    console.error("Error verify & reset:", error);
    return res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
  }
};