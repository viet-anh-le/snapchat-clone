import "../../styles/layout.css";
import React, { useEffect, useState } from "react";
import {
  SearchOutlined,
  PlayCircleOutlined,
  FireOutlined,
  MessageOutlined,
  VideoCameraAddOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  ProfileOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Avatar, Dropdown, Button } from "antd";
import { Logo } from "./Logo";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("theme") || "light"
      : "light"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {
        console.error("Failed to save theme to localStorage:", e);
      }
    }
  }, [theme]);

  // Nếu có user → tạo menu đầy đủ
  const items = user
    ? [
        {
          key: "profile",
          label: (
            <div className="flex items-center gap-3 px-2 py-1">
              <Avatar
                size="small"
                src={user.photoURL}
                icon={<UserOutlined />}
              />
              <div>
                <p className="font-semibold">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500">My Account</p>
              </div>
            </div>
          ),
          disabled: true,
        },
        { type: "divider" },
        {
          key: "profile-link",
          icon: <ProfileOutlined />,
          label: <Link to="/profile">View Profile</Link>,
        },
        {
          key: "settings",
          icon: <SettingOutlined />,
          label: <Link to="/settings">Settings</Link>,
        },
        { type: "divider" },
        {
          key: "logout",
          icon: <LogoutOutlined />,
          label: "Log out",
          danger: true,
        },
      ]
    : [
        {
          key: "login",
          label: <Link to="/login">Log in</Link>,
        },
      ];

  const onClick = async ({ key }) => {
    if (key === "logout") {
      await logout();
    }
  };

  return (
    <header className="pt-6 pb-2 grid grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xs:grid-cols-2 sticky top-0 z-50 bg-white transition-colors">
      {/* Logo + Search */}
      <div className="flex items-center gap-2">
        <div>
          <a
            href="/"
            className="inline-block px-4 py-4 mx-3 rounded-md hover:bg-[#fffc00]"
          >
            <Logo width={24} height={24} />
          </a>
        </div>
        <div className="text-black text-2xl font-black tracking-tight">
          SnapProject
        </div>
      </div>

      {/* Middle features - Desktop only */}
      <div
        id="header-features"
        className="flex gap-8 max-w-[384px] place-self-center cursor-pointer md:flex"
      >
        <Link to={"/stories"}>
          <div className="flex flex-col items-center hover:opacity-70">
            <PlayCircleOutlined style={{ fontSize: "28px" }} />
            <p className="text-xs">Stories</p>
          </div>
        </Link>
        <div className="flex flex-col items-center hover:opacity-70">
          <FireOutlined style={{ fontSize: "28px" }} />
          <p className="text-xs">Spotlight</p>
        </div>
        <Link to={"/chat"}>
          <div className="flex flex-col items-center hover:opacity-70">
            <MessageOutlined style={{ fontSize: "28px" }} />
            <p className="text-xs">Chat</p>
          </div>
        </Link>
        <div className="flex flex-col items-center hover:opacity-70">
          <VideoCameraAddOutlined style={{ fontSize: "28px" }} />
          <p className="text-xs">Lenses</p>
        </div>
      </div>

      {/* User section + Mobile Menu */}
      <div className="place-self-end self-center pr-10 flex items-center gap-4">
        <button
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          aria-label="Toggle theme"
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Toggle light/dark"
        >
          {theme === "dark" ? (
            <SunOutlined style={{ fontSize: 18 }} />
          ) : (
            <MoonOutlined style={{ fontSize: 18 }} />
          )}
        </button>

        {/* Desktop user dropdown */}
        {user ? (
          <Dropdown
            menu={{ items, onClick }}
            trigger={["click"]}
            className="hidden sm:block"
          >
            <a href="#" onClick={(e) => e.preventDefault()}>
              <div className="flex items-center gap-2">
                <Avatar
                  size="large"
                  src={user.photoURL}
                  icon={<UserOutlined />}
                />
                <span className="font-medium hidden lg:inline">
                  {user.displayName || user.email}
                </span>
              </div>
            </a>
          </Dropdown>
        ) : (
          <Button
            type="primary"
            href="/login"
            className="hidden sm:block bg-yellow-400 text-black font-semibold rounded-lg px-5 py-2 hover:bg-yellow-300"
          >
            Login
          </Button>
        )}

        {/* Mobile hamburger menu */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <CloseOutlined style={{ fontSize: 24 }} />
          ) : (
            <MenuOutlined style={{ fontSize: 24 }} />
          )}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 shadow-lg md:hidden z-50 p-4 border-t">
          <div className="flex flex-col gap-3">
            {/* Mobile search */}
            <div className="relative sm:hidden">
              <span className="absolute mt-2 ml-2">
                <SearchOutlined style={{ fontSize: "20px" }} />
              </span>
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none"
              />
            </div>

            {/* Mobile navigation links */}
            <Link to={"/stories"} onClick={() => setMobileMenuOpen(false)}>
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <PlayCircleOutlined style={{ fontSize: "20px" }} />
                <span>Stories</span>
              </div>
            </Link>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
              <FireOutlined style={{ fontSize: "20px" }} />
              <span>Spotlight</span>
            </div>
            <Link to={"/chat"} onClick={() => setMobileMenuOpen(false)}>
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <MessageOutlined style={{ fontSize: "20px" }} />
                <span>Chat</span>
              </div>
            </Link>
            <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
              <VideoCameraAddOutlined style={{ fontSize: "20px" }} />
              <span>Lenses</span>
            </div>

            {/* Mobile user section */}
            {user ? (
              <>
                <div className="border-t pt-3">
                  <div className="flex items-center gap-3 p-2">
                    <Avatar
                      size="large"
                      src={user.photoURL}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <p className="font-semibold text-sm">
                        {user.displayName || user.email}
                      </p>
                      <p className="text-xs text-gray-500">My Account</p>
                    </div>
                  </div>
                </div>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <ProfileOutlined style={{ fontSize: "20px" }} />
                    <span>View Profile</span>
                  </div>
                </Link>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <SettingOutlined style={{ fontSize: "20px" }} />
                    <span>Settings</span>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-3 p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                >
                  <LogoutOutlined style={{ fontSize: "20px" }} />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  type="primary"
                  className="w-full bg-yellow-400 text-black font-semibold"
                >
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
