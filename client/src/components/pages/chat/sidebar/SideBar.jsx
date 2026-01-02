import "./styles.css";

import { Input, Space } from "antd";

import Header from "./Header";
import ChatList from "./ChatList";

export default function SideBar() {
  return (
    <>
      <div className="flex flex-col bg-[#121212] border-r border-gray-700 h-full w-full p-2 max-w-[340px] border border-r-gray-700">
        <Header />
        <Space.Compact className="my-4" id="search-input">
          <Input placeholder="Search" className="input" />
        </Space.Compact>
        <div className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar">
          <ChatList />
        </div>
      </div>
    </>
  );
}
