import { Select } from "antd";

export default function Footer() {
  return (
    <footer className="p-10 bg-[#F8F9FB] bottom-0 w-full">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div className="grid grid-cols-4 justify-center">
          <div>
            <img
              src="/logo/Snapchat-Logo.png"
              alt="Snapchat Logo"
              className="h-16 w-auto -ml-5 mb-5"
            />
            <p className="text-xl">
              Life’s more fun when you live in the moment.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div>
              <p className="text-lg text-[#92989F] font-semibold">Services</p>
              <ul className="text-md">
                <li>Stories</li>
                <li>Spotlight</li>
                <li>Chat</li>
                <li>Lenses</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div>
              <p className="text-lg text-[#92989F] font-semibold">Follow us</p>
              <ul className="text-md">
                <li>
                  <a href="">Github</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div>
              <p className="text-lg text-[#92989F] font-semibold">Contact us</p>
              <ul className="text-md">
                <a href="mailto:anh.lv225250@sis.hust.edu.vn">
                  anh.lv225250@sis.hust.edu.vn
                </a>
              </ul>
            </div>
          </div>
        </div>
        <div>
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
