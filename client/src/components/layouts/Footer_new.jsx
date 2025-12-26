import { Select } from "antd";

export default function Footer() {
  return (
    <footer className="p-6 md:p-10 bg-[#F8F9FB] dark:bg-slate-800 bottom-0 w-full">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          <div>
            <img
              src="/logo/Snapchat-Logo.png"
              alt="Snapchat Logo"
              className="h-12 md:h-16 w-auto -ml-5 mb-3 md:mb-5"
            />
            <p className="text-sm md:text-xl text-gray-700 dark:text-gray-300">
              Life's more fun when you live in the moment.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-center">
            <div>
              <p className="text-base md:text-lg text-[#92989F] font-semibold mb-2">Services</p>
              <ul className="text-sm md:text-md space-y-1 text-gray-700 dark:text-gray-300">
                <li className="hover:opacity-70 cursor-pointer">Stories</li>
                <li className="hover:opacity-70 cursor-pointer">Spotlight</li>
                <li className="hover:opacity-70 cursor-pointer">Chat</li>
                <li className="hover:opacity-70 cursor-pointer">Lenses</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-center">
            <div>
              <p className="text-base md:text-lg text-[#92989F] font-semibold mb-2">Follow us</p>
              <ul className="text-sm md:text-md space-y-1">
                <li className="hover:opacity-70">
                  <a href="" className="text-gray-700 dark:text-gray-300 hover:underline">
                    Github
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-center">
            <div>
              <p className="text-base md:text-lg text-[#92989F] font-semibold mb-2">Contact us</p>
              <ul className="text-sm md:text-md space-y-1">
                <li>
                  <a
                    href="mailto:anh.lv225250@sis.hust.edu.vn"
                    className="text-gray-700 dark:text-gray-300 hover:underline break-all"
                  >
                    anh.lv225250@sis.hust.edu.vn
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="w-full md:w-auto">
          <Select value={"English"} className="w-full md:w-auto">
            <Select.Option value="en">English</Select.Option>
            <Select.Option value="vi">Vietnamese</Select.Option>
          </Select>
        </div>
        <div className="text-xs md:text-sm text-[#92989F] text-center md:text-left">
          Designed by © Group 1 2025. All right reserved
        </div>
      </div>
    </footer>
  );
}
