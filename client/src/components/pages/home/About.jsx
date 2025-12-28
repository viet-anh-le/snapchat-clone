import { DATA } from "../../layouts/constants";

const About = () => {
  return (
    <section
      id="about"
      className="py-24 bg-white dark:bg-gray-800 transition-colors"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl mb-6">
              {DATA.about.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              {DATA.about.content}
            </p>
          </div>
          <div className="order-1 lg:order-2 relative">
            <div className="absolute inset-0 bg-linear-to-tr from-yellow-200 to-pink-200 rounded-3xl transform rotate-3 scale-105 opacity-50 -z-10 dark:opacity-20"></div>
            <img
              src="https://picsum.photos/800/800?grayscale"
              alt="About Us"
              className="rounded-3xl shadow-lg w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
