import "./chat.css";

import { useState } from "react";
import { Outlet } from "react-router-dom";

import { ChatContext } from "../context/ChatContext";

import SideBar from "../components/pages/chat/sidebar/SideBar";
import NewChatPanel from "../components/pages/chat/sidebar/NewChatPanel";

export default function ChatLayout() {
  const [close, setClose] = useState(true);
  const [toggleAddUser, setToggleAddUser] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ChatContext.Provider
      value={{
        close,
        setClose,
        toggleAddUser,
        setToggleAddUser,
        selectedChatId,
        setSelectedChatId,
        receiver,
        setReceiver,
        showNewChat,
        setShowNewChat,
      }}
    >
      <div className="h-screen grid grid-cols-[340px_1fr] md:grid-cols-[280px_1fr] sm:grid-cols-1">
        {/* Sidebar - hidden on mobile by default, visible on tablet+ */}
        <div className={`${sidebarOpen ? "block" : "hidden"} sm:block absolute sm:relative h-full w-full sm:w-auto z-40 sm:z-auto`}>
          <SideBar />
        </div>
        
        {/* Main chat area */}
        <div className="w-full h-full flex flex-col">
          {showNewChat && (
            <div className="absolute top-0 bottom-0 left-[340px] md:left-[280px] sm:left-0 z-50 h-full w-full sm:w-auto shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
              <NewChatPanel />
            </div>
          )}
          {close ? (
            <div className="flex justify-center items-center h-full w-full relative">
              <img src="/bg.webp" className="chat-bg" />
              <Outlet />
            </div>
          ) : (
            <div className="h-full w-full overflow-hidden">
              <Outlet />
            </div>
          )}
        </div>
      </div>
    </ChatContext.Provider>
  );
}
