import { useRoutes, useLocation } from "react-router-dom";
import DefaultLayout from "../layouts/default";
import ChatLayout from "../layouts/chatLayout";
import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import SignupPage from "../pages/Signup";
import ProfilePage from "../pages/Profile";
import SettingsPage from "../pages/Settings";
import Home from "../pages/Home";
import Chat from "../pages/Chat";
import VideoChat from "../pages/VideoChat";
import IncomingCallDialog from "../components/pages/video-chat/IncomingCallDialog";
import StoriesPage from "../components/pages/stories/StoriesPage";
import EditProfile from "../components/pages/profile/EditProfile";

const routes = [
  {
    path: "/",
    element: <DefaultLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      { path: "/camera", element: <Home /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "/stories",
    element: <StoriesPage />,
  },
  {
    path: "/edit-profile",
    element: <EditProfile />,
  },
  {
    path: "/chat",
    element: <ChatLayout />,
    children: [
      {
        path: "",
        element: <Chat />,
      },
    ],
  },
  {
    path: "/video-chat",
    element: <VideoChat />,
  },
  { path: "/login", element: <Login /> },

  { path: "/signup", element: <SignupPage /> },
];

export default function AllRoutes() {
  const elements = useRoutes(routes);
  const location = useLocation();
  const isVideoCallPage = location.pathname.startsWith("/video-chat");
  return (
    <>
      {elements}
      {!isVideoCallPage && <IncomingCallDialog />}
    </>
  );
}
