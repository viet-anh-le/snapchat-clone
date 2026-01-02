import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  where,
} from "firebase/firestore";

export function useStoryData(user) {
  const [myStories, setMyStories] = useState([]);
  const [friendsStories, setFriendsStories] = useState([]);
  const [popularStories, setPopularStories] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- HELPER: Kiểm tra quyền xem (Privacy) ---
  const canViewStory = (story, currentUser) => {
    if (currentUser && story.uid === currentUser.uid) return true; // Của mình
    if (story.privacy === "public") return true; // Public
    if (!currentUser) return false; // Chưa đăng nhập
    if (story.privacy === "friends") {
       // Check whitelist
       return Array.isArray(story.authorizedViewers) && story.authorizedViewers.includes(currentUser.uid);
    }
    return false;
  };

  // --- HELPER: Lấy Guest ID (để tính view nếu chưa login) ---
  const getViewerId = () => {
    if (user?.uid) return user.uid;
    let guestId = localStorage.getItem("guest_viewer_id");
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("guest_viewer_id", guestId);
    }
    return guestId;
  };

  // --- ACTION: Tăng view ---
  const viewStory = async (story) => {
    try {
      if (!story?.id) return;
      const viewerId = getViewerId();
      // Kiểm tra xem viewerId này đã xem story chưa (trong subcollection views)
      const viewRef = doc(db, "stories", story.id, "views", viewerId);
      const viewSnap = await getDoc(viewRef);

      if (!viewSnap.exists()) {
        await setDoc(viewRef, { viewedAt: new Date() });
        // Chỉ tăng biến views tổng nếu chưa xem
        await updateDoc(doc(db, "stories", story.id), {
          views: increment(1),
        });
      }
    } catch (err) {
      console.error("Increase view error:", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    const storiesRef = collection(db, "stories");
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h qua
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);   // 3 ngày qua cho Trending

    // --- QUERY 1: RECENT STORIES (Dùng cho My Story & Friends) ---
    // Lấy theo thời gian mới nhất
    const recentQuery = query(
      storiesRef,
      where("timestamp", ">=", twentyFourHoursAgo),
      orderBy("timestamp", "desc")
    );

    const unsubRecent = onSnapshot(recentQuery, (snapshot) => {
      const allRecent = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Lọc danh sách được phép xem
      const visibleRecent = allRecent.filter(s => canViewStory(s, user));

      if (user) {
        setMyStories(visibleRecent.filter((s) => s.uid === user.uid));
        setFriendsStories(visibleRecent.filter((s) => s.uid !== user.uid));
      } else {
        setMyStories([]);
        setFriendsStories([]);
      }
      // Đã load xong phần quan trọng nhất
      setLoading(false);
    });

    // --- QUERY 2: TRENDING STORIES (Dùng cho Popular) ---
    // Lấy theo Views cao nhất (Sort by views desc)
    // Lưu ý: Trending có thể lấy xa hơn 24h (ví dụ 3 ngày) để danh sách phong phú hơn
   const trendingQuery = query(
      storiesRef,
      where("timestamp", ">=", threeDaysAgo),
      orderBy("views", "desc"),
      limit(20)
    );

    const unsubTrending = onSnapshot(trendingQuery, (snapshot) => {
      const allTrending = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const validTrending = allTrending.filter(s => {
        // 1. FIX DATA CŨ: Nếu không có field privacy -> Coi như Public
        const isPublic = s.privacy === "public" || !s.privacy;
        
        // 2. DEBUG MODE: Tạm thời cho phép hiện story của chính mình để test
        // Khi nào ra production thì bỏ comment dòng dưới để ẩn đi
        // const isNotMe = !user || s.uid !== user.uid; 
        
        return isPublic; // && isNotMe; <--- Uncomment cái này sau khi test xong
      });

      console.log("Trending Raw:", allTrending.length, "| Valid:", validTrending.length); // Log để check
      setPopularStories(validTrending);
    });

    return () => {
      unsubRecent();
      unsubTrending();
    };
  }, [user]);

  return { myStories, friendsStories, popularStories, loading, viewStory };
}