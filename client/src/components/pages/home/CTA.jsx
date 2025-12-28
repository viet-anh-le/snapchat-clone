import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="py-20 bg-slate-50 dark:bg-gray-900 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-yellow-400 dark:bg-yellow-500 rounded-full blur-3xl opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-pink-400 dark:bg-pink-500 rounded-full blur-3xl opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
          Sẵn sàng trải nghiệm sự khác biệt?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg mb-10 max-w-2xl mx-auto">
          Tham gia cộng đồng SnapChat ngay hôm nay để khám phá những điều thú vị
          đang chờ đón bạn.
        </p>
        <Link to="/signup">
          <button
            type="submit"
            className="px-8 py-3 rounded-full bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-transform transform hover:scale-105 shadow-lg shadow-yellow-400/30 dark:shadow-none"
          >
            Đăng ký ngay
          </button>
        </Link>
        <p className="text-gray-500 dark:text-gray-500 text-xs mt-4">
          Bằng việc đăng ký, bạn đồng ý với Điều khoản dịch vụ của chúng tôi.
        </p>
      </div>
    </section>
  );
};
export default CTA;
