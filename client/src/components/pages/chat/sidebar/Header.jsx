import { useContext } from "react";
import { Link } from "react-router-dom";
import { Icons } from "../../../layouts/constants";

import {
  UserOutlined,
  UserAddOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Avatar } from "antd";

import { ChatContext } from "../../../../context/ChatContext";

export default function Header() {
  const { toggleAddUser, setToggleAddUser, showNewChat, setShowNewChat } =
    useContext(ChatContext);
  return (
    <>
      <div className="flex justify-around items-center max-h-[61px] h-1/6 border border-b-gray-700">
        <Avatar size="large" icon={<UserOutlined />} />
        <Link to="/" className="cursor-pointer">
          <Icons.Logo className="w-10 h-10 text-white" />
        </Link>
        <div className="flex gap-2">
          <div
            className="rounded-full bg-[#424242] w-8 h-8 grid place-content-center cursor-pointer"
            onClick={() => setToggleAddUser(!toggleAddUser)}
          >
            <UserAddOutlined style={{ color: "white", fontSize: 18 }} />
          </div>
          <div
            className={`rounded-full w-8 h-8 grid place-content-center cursor-pointer transition
                        ${
                          showNewChat
                            ? "bg-white"
                            : "bg-[#0FADFF] hover:bg-[#0c8ecc]"
                        }`}
            onClick={() => setShowNewChat(!showNewChat)}
          >
            <MessageOutlined
              style={{ color: showNewChat ? "#0FADFF" : "white", fontSize: 18 }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
