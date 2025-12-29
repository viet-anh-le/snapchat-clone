import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Assuming you use react-router
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  MapPin,
  Link as LinkIcon,
  User,
  Mail,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { db, storage, auth } from "../../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Form Data
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    location: "",
    website: "",
  });

  // Image State (File objects for upload, Strings for preview)
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // Refs for hidden file inputs
  const bannerInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  // --- 1. FETCH USER DATA ---
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            displayName: data.displayName || user.displayName || "",
            bio: data.bio || "",
            location: data.location || "",
            website: data.website || "",
          });
          setBannerPreview(
            data.bannerURL ||
              "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop"
          );
          setAvatarPreview(
            data.photoURL || user.photoURL || "https://i.pravatar.cc/150"
          );
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // --- 2. HANDLERS ---

  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Image Selection
  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    if (type === "banner") {
      setBannerFile(file);
      setBannerPreview(previewUrl);
    } else {
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
    }
  };

  // --- 3. SAVE LOGIC ---
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      let newPhotoURL = avatarPreview;
      let newBannerURL = bannerPreview;

      // A. Upload Avatar if changed
      if (avatarFile) {
        const avatarRef = ref(storage, `profiles/${user.uid}/avatar`);
        await uploadBytes(avatarRef, avatarFile);
        newPhotoURL = await getDownloadURL(avatarRef);
      }

      // B. Upload Banner if changed
      if (bannerFile) {
        const bannerRef = ref(storage, `profiles/${user.uid}/banner`);
        await uploadBytes(bannerRef, bannerFile);
        newBannerURL = await getDownloadURL(bannerRef);
      }

      // C. Update Firebase Auth Profile (Display Name & Avatar)
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.displayName,
          photoURL: newPhotoURL,
        });
      }
      // await updateProfile(user, {
      //   displayName: formData.displayName,
      //   photoURL: newPhotoURL,
      // });

      // D. Update Firestore Document (All fields)
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: formData.displayName,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        photoURL: newPhotoURL,
        bannerURL: newBannerURL,
        updatedAt: new Date(),
      });

      setMessage({ type: "success", text: "Profile updated successfully!" });

      // Optional: Navigate back after delay
      // setTimeout(() => navigate('/profile'), 1500);
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage({ type: "error", text: "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-10 transition-colors duration-300">
      {/* --- HEADER --- */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Edit Profile
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-full font-bold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Save
        </button>
      </div>

      <div className="max-w-2xl mx-auto mt-6 px-4">
        {/* --- FEEDBACK MESSAGE --- */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-semibold ${
              message.type === "success"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* --- IMAGES SECTION --- */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-6 transition-colors">
          {/* Banner */}
          <div className="relative h-48 bg-gray-200 dark:bg-gray-800 group">
            <img
              src={bannerPreview}
              alt="Banner"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => bannerInputRef.current.click()}
            >
              <Camera className="text-white drop-shadow-lg" size={32} />
            </div>
            <input
              type="file"
              ref={bannerInputRef}
              onChange={(e) => handleImageChange(e, "banner")}
              className="hidden"
              accept="image/*"
            />
          </div>

          {/* Avatar & Basic Info */}
          <div className="px-6 pb-6 relative">
            <div className="relative -mt-16 mb-4 inline-block group">
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 object-cover bg-white dark:bg-gray-900 transition-colors"
              />
              <div
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => avatarInputRef.current.click()}
              >
                <Camera className="text-white drop-shadow-md" size={24} />
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={(e) => handleImageChange(e, "avatar")}
                className="hidden"
                accept="image/*"
              />
            </div>

            <div className="grid gap-6">
              {/* Display Name */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Display Name
                </label>
                <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-gray-50 dark:bg-gray-800 transition-colors">
                  <User
                    size={18}
                    className="text-gray-400 dark:text-gray-500 mr-2"
                  />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white font-medium placeholder-gray-400"
                    placeholder="Your Name"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="3"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-800 outline-none text-gray-900 dark:text-white resize-none transition-colors"
                  placeholder="Tell the world about yourself..."
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {formData.bio.length}/160
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- DETAILS SECTION --- */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6 transition-colors">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">
            Additional Info
          </h3>

          {/* Location */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Location
            </label>
            <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 bg-gray-50 dark:bg-gray-800 transition-colors">
              <MapPin
                size={18}
                className="text-gray-400 dark:text-gray-500 mr-2"
              />
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white"
                placeholder="City, Country"
              />
            </div>
          </div>

          {/* Website */}
          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Website
            </label>
            <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 bg-gray-50 dark:bg-gray-800 transition-colors">
              <LinkIcon
                size={18}
                className="text-gray-400 dark:text-gray-500 mr-2"
              />
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="flex-1 bg-transparent border-none outline-none text-blue-600 dark:text-blue-400"
                placeholder="https://yoursite.com"
              />
            </div>
          </div>

          {/* Email (Read Only) */}
          <div className="relative opacity-60">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Email (Private)
            </label>
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-gray-100 dark:bg-gray-800 cursor-not-allowed transition-colors">
              <Mail
                size={18}
                className="text-gray-400 dark:text-gray-500 mr-2"
              />
              <input
                type="text"
                value={user?.email || ""}
                readOnly
                className="flex-1 bg-transparent border-none outline-none text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
