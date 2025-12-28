import { DATA } from "../../layouts/constants";

const Features = () => {
  return (
    <section
      id="features"
      className="py-24 bg-white dark:bg-gray-800 relative transition-colors"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl mb-4">
            Tại sao chọn SnapChat?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Chúng tôi mang đến những công cụ tốt nhất để bạn tự do thể hiện bản
            thân và kết nối với thế giới.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {DATA.features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 hover:border-yellow-200 dark:hover:border-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
