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
import NotFound from "../pages/NotFound";
import ProtectedRoute from "./ProtectedRoute";

const routes = [
  {
    path: "/",
    element: <DefaultLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/camera",
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "settings",
        element: (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/stories",
    element: (
      <ProtectedRoute>
        <StoriesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/edit-profile",
    element: (
      <ProtectedRoute>
        <EditProfile />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chat",
    element: (
      <ProtectedRoute>
        <ChatLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "",
        element: <Chat />,
      },
    ],
  },
  {
    path: "/video-chat",
    element: (
      <ProtectedRoute>
        <VideoChat />
      </ProtectedRoute>
    ),
  },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/404", element: <NotFound /> },
  { path: "*", element: <NotFound /> },
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
