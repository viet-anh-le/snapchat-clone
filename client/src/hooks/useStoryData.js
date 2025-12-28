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

  // Helper: Generate/Get Viewer ID
  const getViewerId = () => {
    if (user?.uid) return user.uid;
    let guestId = localStorage.getItem("guest_viewer_id");
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("guest_viewer_id", guestId);
    }
    return guestId;
  };

  // Helper: Increase View Count
  const viewStory = async (story) => {
    try {
      if (!story?.id) return;
      const viewerId = getViewerId();
      const viewRef = doc(db, "stories", story.id, "views", viewerId);
      const viewSnap = await getDoc(viewRef);

      if (!viewSnap.exists()) {
        await setDoc(viewRef, { viewedAt: new Date() });
        await updateDoc(doc(db, "stories", story.id), {
          views: increment(1),
        });
      }
    } catch (err) {
      console.error("Increase view error:", err);
    }
  };

  useEffect(() => {
    const storiesRef = collection(db, "stories");
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Fetch Recent
    const recentQuery = query(
      storiesRef,
      where("timestamp", ">=", twentyFourHoursAgo),
      orderBy("timestamp", "desc")
    );
    const unsubRecent = onSnapshot(recentQuery, (snapshot) => {
      const allStories = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (user) {
        const friends = user.friends || [];
        setMyStories(allStories.filter((s) => s.uid === user.uid));
        setFriendsStories(allStories.filter((s) => friends.includes(s.uid)));
      } else {
        setMyStories([]);
        setFriendsStories([]);
      }
      setLoading(false);
    });

    // 2. Fetch Trending
    const trendingQuery = query(
      storiesRef,
      where("timestamp", ">=", oneWeekAgo),
      orderBy("views", "desc"),
      limit(12)
    );
    const unsubTrending = onSnapshot(trendingQuery, (snapshot) => {
      setPopularStories(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubRecent();
      unsubTrending();
    };
  }, [user]);

  return { myStories, friendsStories, popularStories, loading, viewStory };
}
