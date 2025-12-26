import React, { useEffect, useState, useRef } from 'react';
import { Plus, Eye, Play, X, Heart, ChevronLeft, ChevronRight } from 'lucide-react';

/* --- 1. SKELETON LOADERS --- */
export const StorySkeleton = () => (
  <div className="flex flex-col items-center gap-2 shrink-0 w-[72px]">
    <div className="w-[68px] h-[68px] rounded-full bg-gray-200 animate-pulse" />
    <div className="w-12 h-3 bg-gray-200 rounded animate-pulse" />
  </div>
);

export const CardSkeleton = () => (
  <div className="aspect-[9/16] rounded-2xl bg-gray-200 relative overflow-hidden">
     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 translate-x-[-150%] animate-shimmer" />
  </div>
);

/* --- 2. STORY CIRCLE (AVATAR) --- */
export const StoryCircle = ({ isUser, storyCount, userPhoto, onClick, username }) => {
  const hasStories = storyCount > 0;
  
  return (
    <div onClick={onClick} className="flex flex-col items-center gap-2 cursor-pointer shrink-0 group w-[72px]">
      <div className="relative w-[68px] h-[68px] transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
        {/* Animated Gradient Ring */}
        <div className={`absolute inset-0 rounded-full p-[3px] ${hasStories ? 'animate-gradient-spin' : 'border-2 border-gray-200 border-dashed'}`}>
          <div className="bg-white rounded-full p-[2px] w-full h-full overflow-hidden">
            <img 
              src={userPhoto || 'https://ui-avatars.com/api/?name=User'} 
              alt={username} 
              className="w-full h-full rounded-full object-cover" 
            />
          </div>
        </div>
        
        {/* Plus Badge */}
        {isUser && !hasStories && (
          <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 border-2 border-white shadow-sm transition-transform group-hover:rotate-90">
            <Plus size={12} strokeWidth={4} />
          </div>
        )}
      </div>
      <span className="text-[11px] font-medium text-gray-600 truncate w-full text-center">
        {isUser ? 'Your Story' : username}
      </span>
    </div>
  );
};

/* --- 3. TRENDING CARD --- */
export const TrendingCard = ({ story, onClick }) => {
  return (
    <div onClick={onClick} className="group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer bg-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="w-full h-full overflow-hidden">
        {story.type === 'image' ? (
          <img src={story.media} alt="" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
        ) : (
          <video src={story.media} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" muted />
        )}
      </div>
      
      {/* Overlay & Icons */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
      
      {story.type === 'video' && (
        <div className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20">
          <Play size={12} fill="currentColor" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex items-center gap-2 mb-1">
          <img src={story.avatar || 'https://ui-avatars.com/api/?name=User'} className="w-6 h-6 rounded-full border border-white/50 object-cover" />
          <span className="text-xs text-white/90 font-medium truncate">{story.username}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
          <Eye size={12} />
          <span>{story.views || 0} views</span>
        </div>
      </div>
    </div>
  );
};

/* --- 4. STORY VIEWER (FULL SCREEN) --- */
export const StoryViewer = ({ initialIndex, playlist, onClose, onViewStory }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const currentStory = playlist[currentIndex];

  useEffect(() => {
    setProgress(0);
    setIsLiked(false);
    if (currentStory) onViewStory(currentStory);
  }, [currentIndex, currentStory]);

  useEffect(() => {
    if (!currentStory) return;
    const interval = 50; 
    const duration = currentStory.duration || 5000;
    const step = 100 / (duration / interval);
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < playlist.length - 1) setCurrentIndex(c => c + 1);
          else onClose();
          return 100;
        }
        return prev + step;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [currentIndex, currentStory]);

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center animate-in fade-in duration-300">
      {/* Blurred Background */}
      <div className="absolute inset-0 z-0 opacity-30 blur-3xl scale-110">
         <img src={currentStory.media} className="w-full h-full object-cover" />
      </div>

      <div className="relative w-full h-full md:w-[400px] md:h-[90vh] md:rounded-3xl bg-black overflow-hidden shadow-2xl z-10 ring-1 ring-white/10">
        {/* Progress Bars */}
        <div className="absolute top-4 left-3 right-3 z-30 flex gap-1.5 h-1">
          {playlist.map((_, idx) => (
            <div key={idx} className="flex-1 bg-white/20 rounded-full overflow-hidden h-full">
              <div 
                className="h-full bg-white transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                style={{ width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 z-30 flex items-center gap-3">
          <img src={currentStory.avatar || '/default.png'} className="w-8 h-8 rounded-full border border-white/20" />
          <span className="text-white font-semibold text-sm drop-shadow-md">{currentStory.username}</span>
        </div>

        <button onClick={onClose} className="absolute top-8 right-4 z-30 text-white/80 hover:text-white p-2">
          <X size={24} />
        </button>

        {/* Content */}
        <div className="absolute inset-0 flex items-center bg-black">
          {currentStory.type === 'image' ? (
            <img src={currentStory.media} className="w-full h-full object-contain" />
          ) : (
            <video src={currentStory.media} className="w-full h-full object-contain" autoPlay playsInline />
          )}
        </div>

        {/* Touch Zones */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-20" onClick={() => currentIndex > 0 && setCurrentIndex(c => c - 1)} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-20" onClick={() => currentIndex < playlist.length - 1 ? setCurrentIndex(c => c + 1) : onClose()} />

        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 z-30 bg-gradient-to-t from-black/90 to-transparent pb-8 pt-12">
            <div className="flex gap-4 items-center">
                <input type="text" placeholder="Send message..." className="bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white text-sm w-full focus:outline-none focus:bg-white/20 placeholder-white/50 backdrop-blur-sm" />
                <button onClick={() => setIsLiked(!isLiked)} className="text-white transition-transform active:scale-75">
                    <Heart size={28} fill={isLiked ? "#ef4444" : "transparent"} stroke={isLiked ? "none" : "currentColor"} className={isLiked ? "text-red-500" : ""} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};