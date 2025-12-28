import { useState, useMemo, useEffect } from "react";
import { Plus, LogIn, Sparkles, Filter, Sun, Moon } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useStoryData } from "../../../hooks/useStoryData";
import StoryCreator from "./StoryCreator";
import { Icons } from "../../layouts/constants";
import { Link } from "react-router-dom";

// Import UI Components từ file bên ngoài như cấu trúc cũ
import {
  StoryCircle,
  TrendingCard,
  StoryViewer,
  StorySkeleton,
  CardSkeleton,
} from "./StoryComponents";

export default function StoriesPage() {
  const { user, loginWithGoogle } = useAuth();
  const { myStories, friendsStories, popularStories, loading, viewStory } =
    useStoryData(user);

  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    playlist: [],
    index: 0,
  });

  const [theme, setTheme] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("theme") || "light"
      : "light"
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // --- LOGIC GOM NHÓM: Group friends' stories by username ---
  const uniqueFriends = useMemo(() => {
    if (!friendsStories) return [];

    const groups = {};
    friendsStories.forEach((story) => {
      // Dùng username làm key để gom nhóm
      if (!groups[story.username]) {
        groups[story.username] = {
          username: story.username,
          avatar: story.avatar,
          playlist: [], // Tạo playlist riêng cho user này
        };
      }
      // Đẩy story vào playlist của user đó
      groups[story.username].playlist.push(story);
    });

    return Object.values(groups);
  }, [friendsStories]);
  // ------------------------------------------------

  const handleCreate = async () => {
    if (!user) await loginWithGoogle();
    else setIsCreatorOpen(true);
  };

  const openViewer = (playlist, index = 0) => {
    setViewerState({ isOpen: true, playlist, index });
  };

  return (
    <div className="min-h-screen dark:bg-gray-950 bg-[#FAFAFA] pb-20 font-sans selection:bg-purple-100">
      {/* 1. Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="container mx-auto max-w-6xl px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="inline-block px-4 py-2 mx-2 rounded-md hover:bg-[#fffc00] transition-colors group">
                <Icons.Logo className="w-8 h-8 text-black group-hover:text-black dark:text-white dark:group-hover:text-black" />
              </div>
              {/* Ẩn tên app trên mobile để đỡ chật, hiện trên tablet/desktop */}
              <span className="hidden md:block text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-yellow-500 to-pink-600"></span>
            </Link>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

            <div className="flex items-center gap-2">
              <div className="bg-linear-to-br from-blue-600 to-purple-600 text-white p-1 rounded-md shadow-sm opacity-80">
                <Sparkles size={14} fill="currentColor" />
              </div>
              <h1 className="text-lg font-bold text-gray-700 dark:text-gray-200 tracking-tight">
                Moments
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* --- BUTTON DARK MODE (Mới thêm) --- */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun size={20} className="text-yellow-400" />
              ) : (
                <Moon size={20} />
              )}
            </button>

            <button
              onClick={handleCreate}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-900 dark:bg-white px-5 py-2 font-medium text-white dark:text-slate-900 shadow-lg transition-all duration-300 hover:bg-slate-800 dark:hover:bg-gray-200 hover:scale-105 hover:shadow-blue-500/25"
            >
              {user ? (
                <>
                  <Plus
                    size={16}
                    className="transition-transform group-hover:rotate-90"
                  />
                  <span className="text-sm">Create</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span className="text-sm">Login</span>
                </>
              )}
              <div className="absolute inset-0 -z-10 bg-linear-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 space-y-8 pt-6">
        {/* 2. Stories Rail (My Story + Friends Grouped) */}
        <section>
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide px-1">
            {loading ? (
              Array(6)
                .fill(0)
                .map((_, i) => <StorySkeleton key={i} />)
            ) : (
              <>
                {/* A. My Story */}
                {user && (
                  <StoryCircle
                    isUser={true}
                    username="You"
                    userPhoto={user.photoURL}
                    storyCount={myStories.length}
                    onClick={() =>
                      myStories.length > 0
                        ? openViewer(myStories, 0)
                        : setIsCreatorOpen(true)
                    }
                  />
                )}

                {/* B. Friends Stories (Grouped) */}
                {uniqueFriends.map((friendGroup) => (
                  <StoryCircle
                    key={friendGroup.username}
                    isUser={false}
                    username={friendGroup.username}
                    userPhoto={friendGroup.avatar}
                    storyCount={friendGroup.playlist.length}
                    // Quan trọng: Truyền playlist riêng của friend đó vào viewer
                    onClick={() => openViewer(friendGroup.playlist, 0)}
                  />
                ))}

                {uniqueFriends.length === 0 && !loading && (
                  <div className="flex flex-col justify-center px-4 text-gray-400 text-xs italic border-l border-gray-200 ml-2">
                    <span>No updates from friends.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* 3. Trending Grid */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl dark:text-white font-bold text-gray-800 tracking-tight">
                Trending
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">
                Top stories around the world
              </p>
            </div>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 transition-colors">
              <Filter size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
            {loading
              ? Array(8)
                  .fill(0)
                  .map((_, i) => <CardSkeleton key={i} />)
              : popularStories.map((story, index) => (
                  <TrendingCard
                    key={story.id}
                    story={story}
                    onClick={() => openViewer(popularStories, index)}
                  />
                ))}
          </div>
        </section>
      </div>

      {/* 4. Creator Modal */}
      {isCreatorOpen && user && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <StoryCreator
            currentUser={user}
            onClose={() => setIsCreatorOpen(false)}
          />
        </div>
      )}

      {/* 5. Viewer Modal */}
      {viewerState.isOpen && (
        <StoryViewer
          initialIndex={viewerState.index}
          playlist={viewerState.playlist}
          onClose={() => setViewerState({ ...viewerState, isOpen: false })}
          onViewStory={viewStory}
        />
      )}
    </div>
  );
}
