"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const dropdownRef = useRef(null);

  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    function loadUser() {
      try {
        const savedUser = sessionStorage.getItem("kindora_user");
        const token = sessionStorage.getItem("kindora_token");

        setUser(savedUser && token ? JSON.parse(savedUser) : null);
      } catch {
        setUser(null);
      }
    }

    loadUser();
    setMounted(true);

    window.addEventListener("storage", loadUser);
    window.addEventListener("kindora-auth-change", loadUser);

    function closeDropdown(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setDropdownOpen(false);
    }

    document.addEventListener("mousedown", closeDropdown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("kindora-auth-change", loadUser);
      document.removeEventListener("mousedown", closeDropdown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function handleLogout() {
    sessionStorage.removeItem("kindora_user");
    sessionStorage.removeItem("kindora_token");

    setUser(null);
    setDropdownOpen(false);

    window.dispatchEvent(new Event("kindora-auth-change"));

    router.push("/");
    router.refresh();
  }

  const avatar =
    user?.avatar || user?.photoURL || user?.picture || user?.image || "";

  const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <nav className="relative z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-tight text-[#285b3b]"
        >
          🌙 Kindora
        </Link>

        {/* Navigation */}
        <div className="hidden items-center gap-7 md:flex">
          <Link
            href="/"
            className="text-sm font-semibold text-gray-700 hover:text-[#285b3b]"
          >
            Home
          </Link>

          <Link
            href="/events"
            className="text-sm font-semibold text-gray-700 hover:text-[#285b3b]"
          >
            Upcoming Events
          </Link>

          <Link
            href="/create-event"
            className="text-sm font-semibold text-gray-700 hover:text-[#285b3b]"
          >
            Create Event
          </Link>
        </div>

        {/* Account */}
        <div className="relative" ref={dropdownRef}>
          {mounted && user ? (
            <>
              <button
                type="button"
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-gray-50"
                aria-expanded={dropdownOpen}
                aria-label="Open profile menu"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#285b3b] font-bold text-white">
                    {initials}
                  </span>
                )}

                <span className="max-w-32 truncate text-sm font-semibold text-gray-700">
                  {user.name || "My Account"}
                </span>

                <span className="text-xs text-gray-500">
                  {dropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 shadow-xl">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="truncate text-sm font-bold text-gray-800">
                      {user.name || "User"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {user.email || ""}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-green-50 hover:text-[#285b3b]"
                  >
                    ✏️ Edit Profile
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    ↪ Logout
                  </button>
                </div>
              )}
            </>
          ) : mounted ? (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-bold text-[#285b3b] hover:bg-green-50"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-full bg-[#285b3b] px-5 py-2 text-sm font-bold text-white hover:bg-[#1e482e]"
              >
                Sign Up
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
