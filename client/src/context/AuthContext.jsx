import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hàm đồng bộ dữ liệu user với Firestore
  const syncUserData = async (firebaseUser) => {
    if (!firebaseUser || !db) return;

    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const existingDoc = await getDoc(userRef);

      if (existingDoc.exists()) {
        // Nếu user đã có trong Firestore → chỉ cập nhật lastLogin
        await setDoc(
          userRef,
          {
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // Nếu user mới → tạo bản ghi mới
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });

        await setDoc(doc(db, "userchats", firebaseUser.uid), {
          chats: [],
        });
      }
    } catch (error) {
      console.error("Error syncing user data:", error);
    }
  };

  // Lắng nghe trạng thái đăng nhập
  useEffect(() => {
    if (!auth) {
      // Firebase không cấu hình → set loading false để app vẫn load
      setLoading(false);
      return;
    }
    let unsubscribeFirestore = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);

        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }

        unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({
              ...currentUser,
              ...docSnap.data(),
            });
          } else {
            setUser(currentUser);
          }
          setLoading(false);
        });
      } else {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      unsubscribeAuth();
    };
  }, []);

  // Đăng nhập bằng Google
  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error("Firebase is not configured");
    }
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserData(result.user);
    setUser(result.user);
    return result.user;
  };

  // Đăng ký bằng email
  const signupWithEmail = async (email, password, displayName) => {
    if (!auth) {
      throw new Error("Firebase is not configured");
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await syncUserData({ ...result.user, displayName });
    setUser(result.user);
    return result.user;
  };

  // Đăng nhập bằng email
  const loginWithEmail = async (email, password) => {
    if (!auth) {
      throw new Error("Firebase is not configured");
    }
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncUserData(result.user);
    setUser(result.user);
    return result.user;
  };

  // Đăng xuất
  const logout = async () => {
    if (!auth) {
      setUser(null);
      return;
    }
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
