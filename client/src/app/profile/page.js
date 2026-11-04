"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useTheme } from "@/components/ThemeProvider";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://kindora-api-vb9y.onrender.com";

const PROFILE_API = `${API_BASE}/api/users/me`;

export default function ProfilePage() {
  const router = useRouter();
  const { success, error, warning } = useToast();
  const { dark, toggleTheme } = useTheme();

  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const bg = dark ? "#14231c" : "#faf9f5";
  const surface = dark ? "#1e3027" : "#ffffff";
  const cardHeader = dark ? "#263b2e" : "#f0f2e9";
  const text = dark ? "#f1f5ed" : "#20392c";
  const muted = dark ? "#b8c8bc" : "#68776c";
  const subtle = dark ? "#91a497" : "#89958b";
  const border = dark ? "#35493c" : "#e6e9df";
  const inputBg = dark ? "#14231c" : "#faf9f5";
  const softBg = dark ? "#304638" : "#f0f2e9";
  const green = dark ? "#a8d49a" : "#315b43";

  // INITIALS
  function getInitial(name = "User") {
    return name.trim().charAt(0).toUpperCase() || "U";
  }

  // LOAD PROFILE FROM BACKEND
  useEffect(() => {
    async function loadProfile() {
      const token = sessionStorage.getItem("kindora_token");

      if (!token) {
        warning("Please login to access your profile.");
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(PROFILE_API, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
          sessionStorage.removeItem("kindora_token");
          sessionStorage.removeItem("kindora_user");
          window.dispatchEvent(new Event("kindora-auth-change"));

          error("Your session has expired. Please login again.");
          router.replace("/login");
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load your profile.");
        }

        const profile = data.user || data.profile;

        if (!profile) {
          throw new Error("Profile information was not found.");
        }

        setUser(profile);
        setName(profile.name || "");
        setEmail(profile.email || "");
        setAvatar(profile.avatar || "");
        setAvatarUrl(profile.avatar || "");

        sessionStorage.setItem("kindora_user", JSON.stringify(profile));

        window.dispatchEvent(new Event("kindora-auth-change"));
      } catch (err) {
        console.error("Profile loading error:", err);
        error(err.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router, error, warning]);

  // SELECT PROFILE IMAGE
  function handleImageSelect(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      error("Please select a JPG, PNG, or WEBP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      error("Image size must be less than 2MB.");
      e.target.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(file);

    setPreviewImage((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return localPreview;
    });

    warning(
      "Image preview ready. To save it permanently, use an HTTPS image URL below.",
    );
  }

  // IMAGE URL CHANGE
  function handleAvatarUrlChange(value) {
    setAvatarUrl(value.trim());
    setPreviewImage("");
    setHasChanges(true);
  }

  // REMOVE IMAGE
  function handleRemoveImage() {
    setAvatar("");
    setAvatarUrl("");
    setPreviewImage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setHasChanges(true);
  }

  // SAVE PROFILE
  async function handleSave(e) {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanAvatar = avatarUrl.trim();

    if (!cleanName) {
      warning("Please enter your full name.");
      return;
    }

    if (cleanName.length < 2) {
      warning("Name must contain at least 2 characters.");
      return;
    }

    if (cleanAvatar) {
      try {
        const parsedUrl = new URL(cleanAvatar);

        if (parsedUrl.protocol !== "https:") {
          warning("Profile image URL must start with https://");
          return;
        }
      } catch {
        warning("Please enter a valid profile image URL.");
        return;
      }
    }

    const token = sessionStorage.getItem("kindora_token");

    if (!token) {
      error("Please login again.");
      router.replace("/login");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(PROFILE_API, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: cleanName,
          avatar: cleanAvatar,
        }),
      });

      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("kindora_token");
        sessionStorage.removeItem("kindora_user");

        window.dispatchEvent(new Event("kindora-auth-change"));

        error("Your session has expired. Please login again.");
        router.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Profile update failed.");
      }

      const updatedUser = data.user ||
        data.profile || {
          ...user,
          name: cleanName,
          avatar: cleanAvatar,
        };

      const finalUser = {
        ...user,
        ...updatedUser,
        name: cleanName,
        avatar: cleanAvatar,
      };

      setUser(finalUser);
      setName(finalUser.name || "");
      setEmail(finalUser.email || "");
      setAvatar(finalUser.avatar || "");
      setAvatarUrl(finalUser.avatar || "");
      setPreviewImage("");
      setHasChanges(false);

      sessionStorage.setItem("kindora_user", JSON.stringify(finalUser));

      window.dispatchEvent(new Event("kindora-auth-change"));

      success(data.message || "Profile updated successfully!");

      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (err) {
      console.error("Profile save error:", err);
      error(err.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  // CANCEL CHANGES
  function handleCancel() {
    if (user) {
      setName(user.name || "");
      setAvatar(user.avatar || "");
      setAvatarUrl(user.avatar || "");
    }

    if (previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }

    setPreviewImage("");
    setHasChanges(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    router.push("/");
  }

  // CURRENT PROFILE IMAGE
  const currentImage = previewImage || avatar || "";

  // LOADING SCREEN
  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-4 transition-colors duration-300"
        style={{ background: bg, color: text }}
      >
        <div className="text-center">
          <div
            className="mx-auto h-12 w-12 animate-spin rounded-full border-4"
            style={{
              borderColor: border,
              borderTopColor: green,
            }}
          />

          <p className="mt-5 text-sm font-semibold" style={{ color: green }}>
            Loading your profile...
          </p>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="fixed top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm"
          style={{
            background: surface,
            borderColor: border,
          }}
          aria-label="Toggle theme"
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen px-4 py-10 transition-colors duration-300 sm:py-16"
      style={{ background: bg, color: text }}
    >
      <div className="mx-auto max-w-3xl">
        {/* TOP NAVIGATION */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: green }}
          >
            kindora<span className="text-[#d28b54]">.</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-sm transition hover:scale-105"
              style={{
                background: surface,
                color: text,
                borderColor: border,
              }}
            >
              {dark ? "☀️" : "🌙"}
            </button>

            <Link
              href="/"
              className="rounded-full border px-5 py-2.5 text-sm font-semibold transition"
              style={{
                borderColor: border,
                color: text,
                background: surface,
              }}
            >
              ← Back Home
            </Link>
          </div>
        </div>

        {/* PROFILE CARD */}
        <section
          className="overflow-hidden rounded-3xl border shadow-sm transition-colors duration-300"
          style={{
            background: surface,
            borderColor: border,
          }}
        >
          {/* CARD HEADER */}
          <div
            className="border-b px-6 py-8 sm:px-10"
            style={{
              background: cardHeader,
              borderColor: border,
            }}
          >
            <p
              className="text-xs font-bold tracking-[.2em]"
              style={{ color: dark ? "#a8c99b" : "#789668" }}
            >
              YOUR ACCOUNT
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">My Profile</h1>

            <p className="mt-2 text-sm leading-6" style={{ color: muted }}>
              Manage your personal information and profile picture.
            </p>
          </div>

          {/* PROFILE FORM */}
          <form onSubmit={handleSave} className="p-6 sm:p-10">
            {/* PROFILE PHOTO */}
            <div className="mb-10 flex flex-col items-center">
              <div className="relative">
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt="Profile"
                    className="h-32 w-32 rounded-full border-4 object-cover shadow-sm"
                    style={{ borderColor: border }}
                  />
                ) : (
                  <div
                    className="flex h-32 w-32 items-center justify-center rounded-full border-4 text-5xl font-bold text-white shadow-sm"
                    style={{
                      background: "#315b43",
                      borderColor: border,
                    }}
                  >
                    {getInitial(name)}
                  </div>
                )}

                {/* CHANGE PHOTO BUTTON */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-0 bottom-1 flex h-11 w-11 items-center justify-center rounded-full border-4 text-lg text-white shadow-md transition hover:opacity-90"
                  style={{
                    background: "#315b43",
                    borderColor: surface,
                  }}
                  aria-label="Change profile picture"
                  title="Change profile picture"
                >
                  ✏️
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <h2 className="mt-4 text-lg font-bold">{name || "Your Name"}</h2>

              <p className="mt-1 text-sm" style={{ color: muted }}>
                {email}
              </p>

              {(avatar || previewImage) && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-3 text-xs font-semibold text-red-500 transition hover:text-red-700"
                >
                  Remove photo
                </button>
              )}
            </div>

            {/* PERSONAL INFORMATION */}
            <div className="space-y-6">
              {/* FULL NAME */}
              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-2 block text-sm font-bold"
                >
                  Full Name
                </label>

                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Enter your full name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  className="w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition focus:border-[#789668] focus:ring-2 focus:ring-[#789668]/20"
                  style={{
                    background: inputBg,
                    color: text,
                    borderColor: border,
                  }}
                />
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-2 block text-sm font-bold"
                >
                  Email Address
                </label>

                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border px-4 py-3.5 text-sm outline-none"
                  style={{
                    background: softBg,
                    color: muted,
                    borderColor: border,
                  }}
                />

                <p className="mt-2 text-xs" style={{ color: subtle }}>
                  Your registered email address cannot be changed here.
                </p>
              </div>

              {/* PROFILE IMAGE URL */}
              <div>
                <label
                  htmlFor="profile-avatar"
                  className="mb-2 block text-sm font-bold"
                >
                  Profile Image URL
                </label>

                <input
                  id="profile-avatar"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => handleAvatarUrlChange(e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="w-full rounded-xl border px-4 py-3.5 text-sm outline-none transition focus:border-[#789668] focus:ring-2 focus:ring-[#789668]/20"
                  style={{
                    background: inputBg,
                    color: text,
                    borderColor: border,
                  }}
                />

                <p className="mt-2 text-xs leading-5" style={{ color: subtle }}>
                  Enter an HTTPS image URL to save your profile picture
                  permanently.
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div
              className="mt-10 flex flex-col-reverse gap-3 border-t pt-7 sm:flex-row sm:justify-end"
              style={{ borderColor: border }}
            >
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-full border px-7 py-3.5 text-sm font-bold transition hover:opacity-80 disabled:opacity-50"
                style={{
                  borderColor: border,
                  color: text,
                  background: surface,
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-full px-8 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "#315b43" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* FOOTER NOTE */}
        <p
          className="mt-6 text-center text-xs leading-6"
          style={{ color: subtle }}
        >
          Your profile information is securely saved to your Kindora account.
        </p>
      </div>
    </main>
  );
}
