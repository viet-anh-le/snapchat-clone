import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors">
      <div className="text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-800 mb-4">
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Trang không tồn tại
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc bạn không có
            quyền truy cập.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full transition-colors shadow-lg"
          >
            Về trang chủ
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
