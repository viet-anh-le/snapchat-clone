import React, { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";

const AddFriendModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [searchName, setSearchName] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set()); // Track sent requests in this session

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchName("");
      setResults([]);
      setMessage("");
      setSentRequests(new Set());
    }
  }, [isOpen]);

  // Search Logic
  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setResults([]);
      setMessage("");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const usersRef = collection(db, "users");
      // Note: Firestore string search is case-sensitive by default
      const q = query(
        usersRef,
        where("displayName", ">=", searchTerm),
        where("displayName", "<=", searchTerm + "\uf8ff")
      );
      
      const querySnapshot = await getDocs(q);

      const filtered = querySnapshot.docs
        .filter(doc => doc.id !== user.uid) // exclude current user
        .map(doc => ({ id: doc.id, ...doc.data() }));

      setResults(filtered);
      if (filtered.length === 0) setMessage("No users found.");
    } catch (error) {
      console.error("Search error:", error);
      setMessage("Error searching for users.");
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce Effect: Triggers search 500ms after user stops typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers(searchName);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchName]);

  // Send Request Logic
  const sendFriendRequest = async (friendId) => {
    try {
      // Optimistic UI update: mark as sent immediately
      setSentRequests(prev => new Set(prev).add(friendId));

      const friendshipsRef = collection(db, "friendships");
      
      // Double check existing requests in DB
      const checkQuery = query(
        friendshipsRef,
        where("requester", "in", [user.uid, friendId]),
        where("receiver", "in", [user.uid, friendId])
      );
      const existing = await getDocs(checkQuery);

      if (!existing.empty) {
        setMessage("Request already exists.");
        return;
      }

      await addDoc(friendshipsRef, {
        requester: user.uid,
        receiver: friendId,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

    } catch (err) {
      console.error(err);
      setMessage("Failed to send request.");
      // Revert optimistic update on error
      setSentRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Find Friends</h2>
          <button onClick={onClose} style={styles.closeBtn}>&times;</button>
        </div>

        {/* Search Input */}
        <div style={styles.inputContainer}>
          <input
            type="text"
            placeholder="Search by username..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={styles.input}
            autoFocus
          />
          {isLoading && <div style={styles.spinner}></div>}
        </div>

        {/* Status Message */}
        {message && <p style={styles.message}>{message}</p>}

        {/* Results List */}
        <div style={styles.listContainer}>
          {results.map(u => {
            const isSent = sentRequests.has(u.id);
            return (
              <div key={u.id} style={styles.userCard}>
                <div style={styles.userInfo}>
                  {/* Avatar Placeholder */}
                  <div style={styles.avatar}>
                    {u.displayName ? u.displayName.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div style={styles.userDetails}>
                    <span style={styles.userName}>{u.displayName}</span>
                    <span style={styles.userEmail}>{u.email}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => sendFriendRequest(u.id)}
                  disabled={isSent}
                  style={{
                    ...styles.addBtn,
                    ...(isSent ? styles.sentBtn : {}),
                  }}
                >
                  {isSent ? "Sent" : "Add Friend"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Styles ---
const styles = {
  overlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(3px)", // Modern blur effect
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    animation: "fadeIn 0.2s ease-out",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "450px",
    height: "500px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#666",
    padding: "0 4px",
  },
  inputContainer: {
    padding: "16px 20px 8px 20px",
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  spinner: {
    position: "absolute",
    right: "35px",
    top: "28px",
    width: "16px",
    height: "16px",
    border: "2px solid #f3f3f3",
    borderTop: "2px solid #3498db",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  message: {
    padding: "0 20px",
    fontSize: "13px",
    color: "#666",
    margin: "5px 0",
  },
  listContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 20px 20px 20px",
  },
  userCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    borderBottom: "1px solid #f0f0f0",
    transition: "background 0.2s",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "14px",
  },
  userDetails: {
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#333",
  },
  userEmail: {
    fontSize: "12px",
    color: "#888",
  },
  addBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "white",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  sentBtn: {
    backgroundColor: "#10b981", // Green for success
    cursor: "default",
  },
};

// Add CSS keyframes for spinner and fade-in
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;
document.head.appendChild(styleSheet);

export default AddFriendModal;