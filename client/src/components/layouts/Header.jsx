import "../../styles/layout.css";
import { useEffect, useState } from "react";
import {
  SearchOutlined,
  PlayCircleOutlined,
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
import { Icons } from "./constants";
import { Avatar, Dropdown } from "antd";
import Button from "../pages/home/Button.js";
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
    <header className="py-2 grid grid-cols-2 md:grid-cols-3 sticky top-0 z-50 bg-white dark:bg-gray-900 transition-colors shadow-sm">
      {/* Logo + Search */}
      <div className="flex items-center gap-2">
        <a
          href="/"
          className="inline-block px-4 py-2 mx-2 rounded-md hover:bg-[#fffc00] transition-colors group"
        >
          <Icons.Logo className="w-8 h-8 text-black group-hover:text-black dark:text-white dark:group-hover:text-black" />
        </a>
        <span className="hidden sm:inline text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-yellow-500 to-pink-600">
          SnapChat
        </span>
      </div>

      {/* Middle features - Desktop only */}
      <div
        id="header-features"
        className="flex gap-8 max-w-[384px] place-self-center cursor-pointer md:flex"
      >
        <Link to={"/stories"}>
          <div className="flex flex-col items-center hover:opacity-70 dark:text-gray-200">
            <PlayCircleOutlined style={{ fontSize: "28px" }} />
            <p className="text-xs ">Stories</p>
          </div>
        </Link>
        <Link to={"/chat"}>
          <div className="flex flex-col items-center hover:opacity-70 dark:text-gray-200">
            <MessageOutlined style={{ fontSize: "28px" }} />
            <p className="text-xs">Chat</p>
          </div>
        </Link>
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
          <Link to="/login">
            <Button type="primary">Login</Button>
          </Link>
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
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 rounded">
                <PlayCircleOutlined style={{ fontSize: "20px" }} />
                <span>Stories</span>
              </div>
            </Link>
            <Link to={"/chat"} onClick={() => setMobileMenuOpen(false)}>
              <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 rounded">
                <MessageOutlined style={{ fontSize: "20px" }} />
                <span>Chat</span>
              </div>
            </Link>

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
