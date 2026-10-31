"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function loadUser() {
      try {
        const savedUser = sessionStorage.getItem("kindora_user");
        const savedToken = sessionStorage.getItem("kindora_token");

        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Unable to load user:", error);
        setUser(null);
      }

      setMounted(true);
    }

    loadUser();

    // Login/Logout হলে Navbar update হবে
    window.addEventListener("storage", loadUser);
    window.addEventListener("kindora-auth-change", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("kindora-auth-change", loadUser);
    };
  }, []);

  function handleLogout() {
    sessionStorage.removeItem("kindora_token");
    sessionStorage.removeItem("kindora_user");

    setUser(null);

    // অন্য component-গুলোকেও জানানো
    window.dispatchEvent(new Event("kindora-auth-change"));

    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 text-[#183c2b] backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-3xl">🌱</span>
          <span className="text-2xl font-extrabold tracking-tight">
            Kindora
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/" className="transition hover:text-[#609568]">
            Home
          </Link>

          <Link
            href="/upcoming-events"
            className="transition hover:text-[#609568]"
          >
            Upcoming Events
          </Link>

          <Link
            href="/create-event"
            className="transition hover:text-[#609568]"
          >
            Create Event
          </Link>
        </div>

        {/* Authentication buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {mounted && user ? (
            <>
              <span className="hidden max-w-32 truncate text-sm font-semibold sm:inline">
                Hi, {user.name || "User"}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-[#285b3b] px-4 py-2 text-sm font-semibold transition hover:bg-[#285b3b] hover:text-white"
              >
                Logout
              </button>
            </>
          ) : mounted ? (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-gray-100 sm:px-4"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-full bg-[#285b3b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e482e]"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <div className="h-10 w-28" aria-hidden="true" />
          )}
        </div>
      </nav>

      {/* Mobile navigation */}
      <div className="flex justify-center gap-5 border-t border-gray-100 px-3 py-3 text-xs font-medium text-gray-600 md:hidden">
        <Link href="/" className="transition hover:text-[#609568]">
          Home
        </Link>

        <Link
          href="/upcoming-events"
          className="transition hover:text-[#609568]"
        >
          Events
        </Link>

        <Link href="/create-event" className="transition hover:text-[#609568]">
          Create Event
        </Link>
      </div>
    </header>
  );
}
