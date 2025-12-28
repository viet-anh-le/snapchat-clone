import "./chat.css";

import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { CloseOutlined, MenuOutlined } from "@ant-design/icons";

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
  const [isMobile, setIsMobile] = useState(false);
  const lastIsMobile = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobileView = window.innerWidth < 768;
      setIsMobile(mobileView);

      // Only toggle sidebar when crossing the breakpoint to avoid closing it while open
      if (
        lastIsMobile.current === null ||
        lastIsMobile.current !== mobileView
      ) {
        setSidebarOpen(!mobileView);
        lastIsMobile.current = mobileView;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        sidebarOpen,
        setSidebarOpen,
        isMobile,
      }}
    >
      <div className="chat-layout relative h-screen grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[340px_1fr] overflow-hidden bg-transparent">
        {/* Backdrop for mobile sidebar */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - slides in on mobile, static on tablet/desktop */}
        <div
          className={`${
            isMobile ? "fixed" : "relative"
          } inset-y-0 left-0 md:static md:inset-auto z-40 md:z-auto h-full w-[82vw] max-w-[340px] md:w-auto transform transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="relative h-full">
            {isMobile && (
              <button
                className="md:hidden absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-[#1E1E1E] border border-gray-700 text-white grid place-content-center"
                onClick={() => setSidebarOpen(false)}
                aria-label="Đóng danh sách chat"
              >
                <CloseOutlined />
              </button>
            )}
            <SideBar />
          </div>
        </div>

        {/* Main chat area */}
        <div className="relative w-full h-full flex flex-col">
          {isMobile && !sidebarOpen && (
            <button
              className="md:hidden absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-[#1E1E1E] text-white shadow-lg border border-gray-700"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở danh sách chat"
            >
              <MenuOutlined />
              <span className="text-sm font-semibold">Chats</span>
            </button>
          )}

          {showNewChat && (
            <div className="absolute top-0 bottom-0 left-0 z-50 h-full w-full sm:w-auto shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
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
