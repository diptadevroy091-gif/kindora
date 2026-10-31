"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://kindora-api-vb9y.onrender.com";

const PROFILE_API = `${API_BASE}/api/users/me`;

export default function ProfilePage() {
  const router = useRouter();
  const { success, error, warning } = useToast();

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

        // Keep latest user information in sessionStorage.
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

      // Keep all updated user information.
      const finalUser = {
        ...user,
        ...updatedUser,
        name: cleanName,
        avatar: cleanAvatar,
      };

      // Update React state.
      setUser(finalUser);
      setName(finalUser.name || "");
      setEmail(finalUser.email || "");
      setAvatar(finalUser.avatar || "");
      setAvatarUrl(finalUser.avatar || "");
      setPreviewImage("");
      setHasChanges(false);

      // Update sessionStorage.
      sessionStorage.setItem("kindora_user", JSON.stringify(finalUser));

      // Notify Navbar and other components.
      window.dispatchEvent(new Event("kindora-auth-change"));

      success(data.message || "Profile updated successfully!");

      // Return to Home after successful save.
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
      <main className="flex min-h-screen items-center justify-center bg-[#faf9f5] px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#e5ebdf] border-t-[#315b43]" />

          <p className="mt-5 text-sm font-semibold text-[#315b43]">
            Loading your profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f5] px-4 py-10 text-[#20392c] sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* TOP NAVIGATION */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-extrabold tracking-tight text-[#315b43]"
          >
            kindora<span className="text-[#d28b54]">.</span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#e6e9df] px-5 py-2.5 text-sm font-semibold transition hover:bg-[#f0f2e9]"
          >
            ← Back Home
          </Link>
        </div>

        {/* PROFILE CARD */}
        <section className="overflow-hidden rounded-3xl border border-[#e6e9df] bg-white shadow-sm">
          {/* CARD HEADER */}
          <div className="border-b border-[#e6e9df] bg-[#f0f2e9] px-6 py-8 sm:px-10">
            <p className="text-xs font-bold tracking-[.2em] text-[#789668]">
              YOUR ACCOUNT
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">My Profile</h1>

            <p className="mt-2 text-sm leading-6 text-[#68776c]">
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
                    className="h-32 w-32 rounded-full border-4 border-[#e8eee0] object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-[#e8eee0] bg-[#315b43] text-5xl font-bold text-white shadow-sm">
                    {getInitial(name)}
                  </div>
                )}

                {/* CHANGE PHOTO BUTTON */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-0 bottom-1 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-[#315b43] text-lg text-white shadow-md transition hover:bg-[#244532]"
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

              <p className="mt-1 text-sm text-[#68776c]">{email}</p>

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
                  className="w-full rounded-xl border border-[#e6e9df] bg-[#faf9f5] px-4 py-3.5 text-sm outline-none transition focus:border-[#789668] focus:ring-2 focus:ring-[#789668]/20"
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
                  className="w-full cursor-not-allowed rounded-xl border border-[#e6e9df] bg-[#f0f2e9] px-4 py-3.5 text-sm text-[#68776c] outline-none"
                />

                <p className="mt-2 text-xs text-[#89958b]">
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
                  className="w-full rounded-xl border border-[#e6e9df] bg-[#faf9f5] px-4 py-3.5 text-sm outline-none transition focus:border-[#789668] focus:ring-2 focus:ring-[#789668]/20"
                />

                <p className="mt-2 text-xs leading-5 text-[#89958b]">
                  Enter an HTTPS image URL to save your profile picture
                  permanently.
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-[#e6e9df] pt-7 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-full border border-[#e6e9df] px-7 py-3.5 text-sm font-bold transition hover:bg-[#f0f2e9] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#315b43] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#244532] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>

        {/* FOOTER NOTE */}
        <p className="mt-6 text-center text-xs leading-6 text-[#89958b]">
          Your profile information is securely saved to your Kindora account.
        </p>
      </div>
    </main>
  );
}
