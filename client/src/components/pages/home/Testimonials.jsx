import { DATA, Icons } from "../../layouts/constants";

const Testimonials = () => {
  return (
    <section
      id="testimonials"
      className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl mb-4">
              Người dùng nói gì về chúng tôi
            </h2>
            <div className="h-1 w-20 bg-yellow-400 rounded-full"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-md text-left md:text-right">
            Hàng triệu bạn trẻ đã tin dùng SnapChat mỗi ngày.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {DATA.testimonials.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Icons.Zap
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "{item.content}"
              </p>
              <div className="flex items-center gap-4">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-yellow-100 dark:ring-yellow-900"
                />
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {item.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
