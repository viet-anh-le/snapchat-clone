import { apiClient } from "../apiClient"; // Import axios instance đã cấu hình

export const authService = {
  /**
   * Gửi yêu cầu OTP về email
   * @param {string} email - Email nhận mã
   */
  sendOtp: async (email) => {
    // Gọi endpoint: POST /api/auth/send-otp
    // Lưu ý: apiClient (đã cấu hình interceptor) sẽ tự động gắn Token nếu user đang đăng nhập
    const response = await apiClient.post("/api/auth/send-otp", { email });
    return response.data;
  },

  /**
   * Xác thực OTP và Đổi mật khẩu
   * @param {Object} data - { email, otp, newPassword }
   */
  resetPassword: async ({ email, otp, newPassword }) => {
    // Gọi endpoint: POST /api/auth/reset-password
    const response = await apiClient.post("/api/auth/reset-password", {
      email,
      otp,
      newPassword,
    });
    return response.data;
  },
  
  // Bạn có thể thêm các hàm khác như login, register tại đây...
};