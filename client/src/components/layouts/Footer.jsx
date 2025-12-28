import { Icons } from "./constants";

const Footer = () => {
  return (
    <footer className="p-6 md:p-10 bg-[#F8F9FB] dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-5xl mx-auto flex flex-col gap-8 md:gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-4">
              <Icons.Logo className="w-10 h-10 text-black dark:text-white" />
            </div>
            <p className="text-sm md:text-lg text-gray-700 dark:text-gray-400 font-medium leading-tight">
              Life's more fun when you live in the moment.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-center">
            <div>
              <p className="text-base md:text-lg text-[#92989F] dark:text-gray-500 font-bold mb-3 uppercase tracking-wider">
                Services
              </p>
              <ul className="text-sm md:text-md space-y-2 text-gray-700 dark:text-gray-300">
                <li className="hover:opacity-70 cursor-pointer hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                  Stories
                </li>
                <li className="hover:opacity-70 cursor-pointer hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                  Spotlight
                </li>
                <li className="hover:opacity-70 cursor-pointer hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                  Chat
                </li>
                <li className="hover:opacity-70 cursor-pointer hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors">
                  Lenses
                </li>
              </ul>
            </div>
          </div>

          {/* Follow Us */}
          <div className="flex flex-col items-start md:items-center">
            <div>
              <p className="text-base md:text-lg text-[#92989F] dark:text-gray-500 font-bold mb-3 uppercase tracking-wider">
                Follow us
              </p>
              <ul className="text-sm md:text-md space-y-2">
                <li className="hover:opacity-70">
                  <a
                    href="#"
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:underline hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                  >
                    <Icons.Github className="w-4 h-4" /> Github
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col items-start md:items-center">
            <div>
              <p className="text-base md:text-lg text-[#92989F] dark:text-gray-500 font-bold mb-3 uppercase tracking-wider">
                Contact us
              </p>
              <ul className="text-sm md:text-md space-y-2">
                <li>
                  <a
                    href="mailto:anh.lv225250@sis.hust.edu.vn"
                    className="text-gray-700 dark:text-gray-300 hover:underline hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors break-all"
                  >
                    anh.lv225250@sis.hust.edu.vn
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-gray-200 dark:border-gray-800 pt-6 mt-2">
          <div className="w-full md:w-auto">
            <div className="relative inline-block w-full md:w-32">
              <select className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm">
                <option value="en">English</option>
                <option value="vi">Vietnamese</option>
              </select>
            </div>
          </div>
          <div className="text-xs md:text-sm text-[#92989F] dark:text-gray-500 text-center md:text-right">
            Designed by © Group 1 2025. All right reserved
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
