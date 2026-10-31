"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

const API_URL = "https://kindora-api-vb9y.onrender.com/api/events";

const NEWSLETTER_API =
  "https://kindora-api-vb9y.onrender.com/api/newsletter/subscribe";

const features = [
  {
    number: "01",
    icon: "🌱",
    title: "Create an impact",
    description:
      "Create community events and bring people together around a cause.",
  },
  {
    number: "02",
    icon: "🤝",
    title: "Join your people",
    description:
      "Discover local initiatives and volunteer with your community.",
  },
  {
    number: "03",
    icon: "💚",
    title: "Track your journey",
    description:
      "Keep track of the events you join and the difference you make.",
  },
];

const emptyForm = {
  title: "",
  type: "",
  location: "",
  date: "",
  image: "",
  description: "",
};

export default function Home() {
  const { success, error, warning } = useToast();

  const [dark, setDark] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // PROFILE IMAGE
  const profileImage =
    user?.avatar || user?.photoURL || user?.picture || user?.image || "";

  // USER INITIALS
  function getInitials(name = "User") {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }

  // GET AUTH TOKEN
  function getAuthToken() {
    if (typeof window === "undefined") return null;

    return sessionStorage.getItem("kindora_token");
  }

  // CHECK EVENT OWNER
  function isEventOwner(event) {
    if (!user?._id || !event?.ownerId) return false;

    const ownerId =
      typeof event.ownerId === "object"
        ? String(event.ownerId._id || event.ownerId)
        : String(event.ownerId);

    return ownerId === String(user._id);
  }

  // AUTHENTICATION
  useEffect(() => {
    function loadUser() {
      try {
        const savedUser = sessionStorage.getItem("kindora_user");
        const savedToken = sessionStorage.getItem("kindora_token");

        if (savedUser && savedToken) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Could not read login information:", err);
        setUser(null);
      }

      setAuthChecked(true);
    }

    loadUser();

    window.addEventListener("kindora-auth-change", loadUser);
    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("kindora-auth-change", loadUser);
      window.removeEventListener("storage", loadUser);
    };
  }, []);

  // LOGOUT
  function handleLogout() {
    sessionStorage.removeItem("kindora_token");
    sessionStorage.removeItem("kindora_user");

    setUser(null);
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);

    window.dispatchEvent(new Event("kindora-auth-change"));
    window.location.href = "/";
  }

  // FETCH EVENTS
  async function fetchEvents() {
    setEventsLoading(true);
    setEventsError("");

    try {
      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load events.");
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      console.error("Events fetch error:", err);

      setEventsError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Please check your connection and try again."
          : err.message || "Unable to load events.",
      );

      error("Unable to load events. Please try again.");
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEWSLETTER
  async function handleNewsletterSubmit(e) {
    e.preventDefault();

    const cleanEmail = newsletterEmail.trim().toLowerCase();

    if (!cleanEmail) {
      warning("Please enter your email address.");
      return;
    }

    try {
      setNewsletterLoading(true);

      const response = await fetch(NEWSLETTER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Subscription failed.");
      }

      success(data.message || "Successfully subscribed! Welcome to Kindora.");
      setNewsletterEmail("");
    } catch (err) {
      console.error("Newsletter subscription error:", err);

      error(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Please try again later."
          : err.message || "Newsletter subscription failed.",
      );
    } finally {
      setNewsletterLoading(false);
    }
  }

  // OPEN EDIT MODAL
  function handleEditClick(event) {
    const token = getAuthToken();

    if (!token || !user) {
      warning("Please login to edit your event.");
      window.location.href = "/login";
      return;
    }

    if (!isEventOwner(event)) {
      error("You can only edit events created by you.");
      return;
    }

    setEditingEvent(event);

    setEditForm({
      title: event.title || "",
      type: event.type || "",
      location: event.location || "",
      date: event.date ? String(event.date).slice(0, 10) : "",
      image: event.image || "",
      description: event.description || "",
    });
  }

  // CLOSE EDIT MODAL
  function handleCloseEdit() {
    if (saving) return;

    setEditingEvent(null);
    setEditForm(emptyForm);
  }

  // EDIT INPUT
  function handleEditChange(e) {
    const { name, value } = e.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // UPDATE EVENT
  async function handleUpdate(e) {
    e.preventDefault();

    if (!editingEvent?._id) {
      error("Event ID is missing.");
      return;
    }

    const token = getAuthToken();

    if (!token || !user) {
      error("Your login session has expired. Please login again.");
      window.location.href = "/login";
      return;
    }

    if (!isEventOwner(editingEvent)) {
      error("You can only update your own events.");
      setEditingEvent(null);
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/${editingEvent._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not update event.");
      }

      const updatedEvent = data.event || data.updatedEvent;

      setEvents((previousEvents) =>
        previousEvents.map((event) =>
          event._id === editingEvent._id
            ? updatedEvent
              ? updatedEvent
              : { ...event, ...editForm }
            : event,
        ),
      );

      setEditingEvent(null);
      setEditForm(emptyForm);

      success(data.message || "Event updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      error(err.message || "Event update failed.");
    } finally {
      setSaving(false);
    }
  }

  // DELETE EVENT
  async function handleDelete(event) {
    if (!event?._id) {
      error("Event ID is missing.");
      return;
    }

    const token = getAuthToken();

    if (!token || !user) {
      warning("Please login to delete your event.");
      window.location.href = "/login";
      return;
    }

    if (!isEventOwner(event)) {
      error("You can only delete events created by you.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(event._id);

      const response = await fetch(`${API_URL}/${event._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not delete event.");
      }

      setEvents((previousEvents) =>
        previousEvents.filter((item) => item._id !== event._id),
      );

      success(data.message || "Event deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      error(err.message || "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  // THEME COLORS
  const bg = dark ? "#14231c" : "#faf9f5";
  const surface = dark ? "#1e3027" : "#ffffff";
  const text = dark ? "#f1f5ed" : "#20392c";
  const muted = dark ? "#b8c8bc" : "#68776c";
  const border = dark ? "#35493c" : "#e6e9df";
  const green = "#315b43";

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/upcoming-events", label: "Upcoming Events" },
    { href: "#about", label: "About Us" },
    { href: "/create-event", label: "Create Event" },
  ];

  return (
    <main
      id="home"
      style={{
        background: bg,
        color: text,
        minHeight: "100vh",
        transition: "background .25s, color .25s",
      }}
    >
      {/* NAVBAR */}
      <header
        className="sticky top-0 z-40"
        style={{
          borderBottom: `1px solid ${border}`,
          background: dark ? "rgba(20,35,28,.94)" : "rgba(250,249,245,.94)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 text-2xl font-extrabold tracking-tight"
            style={{ color: dark ? "#b7d9a8" : green }}
          >
            kindora<span style={{ color: "#d28b54" }}>.</span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <div className="hidden items-center gap-7 text-sm font-medium lg:flex">
            {navLinks.map((item) =>
              item.href.startsWith("#") ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="transition hover:opacity-60"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="transition hover:opacity-60"
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>

          {/* NAVBAR ACTIONS */}
          <div className="flex shrink-0 items-center gap-2">
            {/* THEME BUTTON */}
            <button
              type="button"
              onClick={() => setDark((previous) => !previous)}
              aria-label="Toggle color theme"
              className="flex h-10 w-10 items-center justify-center rounded-full border text-sm"
              style={{ borderColor: border }}
            >
              {dark ? "☀️" : "🌙"}
            </button>

            {/* LOGGED IN PROFILE */}
            {authChecked && user ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((previous) => !previous)}
                  className="flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 transition hover:opacity-80"
                  style={{ borderColor: border }}
                  aria-expanded={profileMenuOpen}
                  aria-label="Open profile menu"
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: green }}
                    >
                      {getInitials(user.name)}
                    </span>
                  )}

                  <span className="max-w-28 truncate text-sm font-semibold">
                    {user.name || "User"}
                  </span>

                  <span className="text-xs">⌄</span>
                </button>

                {/* PROFILE DROPDOWN */}
                {profileMenuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-2xl border p-2 shadow-xl"
                    style={{
                      background: surface,
                      borderColor: border,
                    }}
                  >
                    <div
                      className="border-b px-3 py-3"
                      style={{ borderColor: border }}
                    >
                      <p className="truncate text-sm font-bold">
                        {user.name || "User"}
                      </p>

                      <p
                        className="mt-1 truncate text-xs"
                        style={{ color: muted }}
                      >
                        {user.email || ""}
                      </p>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="mt-2 block rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-black/5"
                    >
                      ✏️ Edit Profile
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-500 transition hover:bg-red-50"
                    >
                      ↪ Logout
                    </button>
                  </div>
                )}
              </div>
            ) : authChecked ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: green }}
                >
                  Login ↗
                </Link>

                <Link
                  href="/register"
                  className="rounded-full border px-4 py-2.5 text-sm font-semibold"
                  style={{ borderColor: border }}
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div
                className="hidden h-10 w-20 rounded-full sm:block"
                style={{ background: border }}
              />
            )}

            {/* MOBILE MENU BUTTON */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((previous) => !previous)}
              className="flex h-10 w-10 items-center justify-center rounded-full border text-xl lg:hidden"
              style={{ borderColor: border }}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>

          {/* MOBILE DROPDOWN */}
          {mobileMenuOpen && (
            <div
              className="absolute top-full right-3 left-3 mt-2 rounded-2xl border p-4 shadow-xl lg:hidden"
              style={{ background: surface, borderColor: border }}
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((item) =>
                  item.href.startsWith("#") ? (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-black/5"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-black/5"
                    >
                      {item.label}
                    </Link>
                  ),
                )}

                <div
                  className="my-2 border-t"
                  style={{ borderColor: border }}
                />

                {authChecked && user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white"
                          style={{ background: green }}
                        >
                          {getInitials(user.name)}
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {user.name || "User"}
                        </p>
                        <p
                          className="truncate text-xs"
                          style={{ color: muted }}
                        >
                          {user.email || ""}
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-black/5"
                    >
                      ✏️ Edit Profile
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-500"
                    >
                      ↪ Logout
                    </button>
                  </>
                ) : authChecked ? (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-semibold"
                    >
                      Login ↗
                    </Link>

                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-semibold"
                    >
                      Sign Up
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-16 md:grid-cols-2 md:py-24 lg:px-8">
        <div>
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold"
            style={{ borderColor: border, color: muted }}
          >
            <span>✳</span> SMALL ACTS. BIG CHANGE.
          </div>

          <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            A little good
            <br />
            goes a <span style={{ color: "#7b9c69" }}>long way.</span>
          </h1>

          <p
            className="mt-6 max-w-lg text-sm leading-7 sm:text-base sm:leading-8"
            style={{ color: muted }}
          >
            Good things happen when we come together. Discover local community
            events, lend a hand, and help build a kinder world.
          </p>

          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <a
              href="#upcoming"
              className="rounded-full px-6 py-3.5 text-center font-semibold text-white transition hover:opacity-90"
              style={{ background: green }}
            >
              Explore events ↗
            </a>

            <Link
              href="/create-event"
              className="rounded-full border px-6 py-3.5 text-center font-semibold transition hover:opacity-70"
              style={{ borderColor: border }}
            >
              + Create an event
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <div className="flex -space-x-2">
              {["🌿", "💚", "🌼", "🤝"].map((item, index) => (
                <span
                  key={index}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg"
                  style={{
                    background: ["#e4eadb", "#f3e5d4", "#e0e9dd", "#eee4d9"][
                      index
                    ],
                    borderColor: bg,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>

            <p className="text-sm" style={{ color: muted }}>
              <strong style={{ color: text }}>Every hand matters.</strong>
              <br />
              Find your way to make a difference.
            </p>
          </div>
        </div>

        {/* HERO IMAGE */}
        <div className="relative mx-auto w-full max-w-xl">
          <div
            className="overflow-hidden rounded-3xl p-2 sm:rounded-4xl sm:p-3"
            style={{ background: dark ? "#283d30" : "#e7ecdf" }}
          >
            <div
              className="min-h-72 overflow-hidden rounded-2xl bg-cover bg-center sm:min-h-96 md:min-h-122.5"
              role="img"
              aria-label="Volunteers working together"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=85)",
              }}
            />
          </div>

          <div
            className="absolute right-2 bottom-5 max-w-52 rounded-2xl p-3 shadow-xl sm:right-0 sm:bottom-7 sm:max-w-56 sm:p-4"
            style={{ background: surface }}
          >
            <p className="text-2xl">🌍</p>
            <p className="mt-2 text-sm font-bold sm:text-base">
              Change starts locally.
            </p>
            <p className="mt-1 text-xs leading-5" style={{ color: muted }}>
              One event. One community. A better tomorrow.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="about"
        className="px-4 py-16 sm:px-6 md:py-20"
        style={{ background: dark ? "#192920" : "#f0f2e9" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p
              className="text-xs font-bold tracking-[.2em]"
              style={{ color: "#789668" }}
            >
              THE KINDORA WAY
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Good intentions, real action.
            </h2>

            <p
              className="mt-3 text-sm leading-7 sm:text-base"
              style={{ color: muted }}
            >
              Making a difference should feel simple. Here is how you can get
              involved.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border p-6 sm:p-7"
                style={{ background: surface, borderColor: border }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{feature.icon}</span>
                  <span className="text-sm" style={{ color: muted }}>
                    {feature.number}
                  </span>
                </div>

                <h3 className="mt-7 text-xl font-bold">{feature.title}</h3>

                <p
                  className="mt-3 text-sm leading-7 sm:text-base"
                  style={{ color: muted }}
                >
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section
        id="upcoming"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8"
      >
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p
              className="text-xs font-bold tracking-[.2em]"
              style={{ color: "#789668" }}
            >
              MAKE IT COUNT
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Find your next good thing.
            </h2>

            <p className="mt-3 text-sm sm:text-base" style={{ color: muted }}>
              Small steps can make a world of difference.
            </p>
          </div>

          <Link
            href="/upcoming-events"
            className="rounded-full border px-5 py-3 text-sm font-semibold"
            style={{ borderColor: border }}
          >
            All events ↗
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eventsLoading ? (
            <div
              className="col-span-full rounded-2xl border px-6 py-12 text-center"
              style={{ background: surface, borderColor: border }}
              role="status"
            >
              <p className="text-lg font-semibold">Loading events...</p>
              <p className="mt-2 text-sm" style={{ color: muted }}>
                Please wait while we fetch community events.
              </p>
            </div>
          ) : eventsError ? (
            <div
              className="col-span-full rounded-2xl border px-6 py-12 text-center"
              style={{ background: surface, borderColor: border }}
              role="alert"
            >
              <p className="text-4xl">⚠️</p>
              <h3 className="mt-4 text-xl font-bold">Could not load events</h3>
              <p
                className="mx-auto mt-2 max-w-xl wrap-break-word text-sm"
                style={{ color: muted }}
              >
                {eventsError}
              </p>

              <button
                type="button"
                onClick={fetchEvents}
                className="mt-5 rounded-full px-6 py-3 font-semibold text-white disabled:opacity-60"
                style={{ background: green }}
              >
                Try again ↻
              </button>
            </div>
          ) : events.length === 0 ? (
            <div
              className="col-span-full rounded-2xl border px-6 py-12 text-center"
              style={{ background: surface, borderColor: border }}
            >
              <p className="text-4xl">🌱</p>

              <h3 className="mt-4 text-xl font-bold">
                No events available yet
              </h3>

              <p className="mt-2 text-sm" style={{ color: muted }}>
                Be the first to create a community event!
              </p>

              <Link
                href="/create-event"
                className="mt-5 inline-block rounded-full px-6 py-3 font-semibold text-white"
                style={{ background: green }}
              >
                + Create an event
              </Link>

              <button
                type="button"
                onClick={fetchEvents}
                className="mx-auto mt-4 block text-sm underline"
                style={{ color: muted }}
              >
                Refresh events
              </button>
            </div>
          ) : (
            events.slice(0, 3).map((event) => (
              <article
                key={event._id || event.title}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border"
                style={{ background: surface, borderColor: border }}
              >
                <div
                  className="h-48 bg-cover bg-center sm:h-52"
                  role="img"
                  aria-label={event.title || "Community event"}
                  style={{
                    backgroundColor: "#e4e8d8",
                    backgroundImage: event.image
                      ? `url("${event.image}")`
                      : "none",
                  }}
                />

                <div className="flex flex-1 flex-col p-5">
                  <span
                    className="w-fit rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: dark ? "#304638" : "#e8efe3",
                      color: dark ? "#c4e2b8" : green,
                    }}
                  >
                    {event.type || "Community"}
                  </span>

                  <h3 className="mt-4 wrap-break-word text-lg font-bold">
                    {event.title}
                  </h3>

                  <p
                    className="mt-2 wrap-break-word text-sm"
                    style={{ color: muted }}
                  >
                    📍 {event.location || "Location not specified"}
                  </p>

                  <p className="mt-2 text-sm" style={{ color: muted }}>
                    📅 {event.date || "Date not specified"}
                  </p>

                  {event.description && (
                    <p
                      className="mt-3 line-clamp-3 text-sm leading-6"
                      style={{ color: muted }}
                    >
                      {event.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                    <Link
                      href={`/events/${event._id}`}
                      className="mr-auto text-sm font-bold"
                      style={{ color: dark ? "#b7d9a8" : green }}
                    >
                      View event ↗
                    </Link>

                    {authChecked && user && isEventOwner(event) && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditClick(event)}
                          className="rounded-full border px-3 py-2 text-xs font-semibold transition hover:opacity-70 sm:px-4 sm:text-sm"
                          style={{ borderColor: border }}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(event)}
                          disabled={deletingId === event._id}
                          className="rounded-full border border-red-300 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
                        >
                          {deletingId === event._id
                            ? "Deleting..."
                            : "🗑 Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/create-event"
            className="inline-flex items-center justify-center rounded-full px-6 py-3.5 font-semibold text-white transition hover:opacity-90"
            style={{ background: green }}
          >
            + Create a community event
          </Link>
        </div>
      </section>

      {/* EDIT EVENT MODAL */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:items-center sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleCloseEdit();
          }}
        >
          <div
            className="my-3 w-full max-w-xl rounded-2xl p-5 shadow-2xl sm:my-8 sm:rounded-3xl sm:p-6"
            style={{
              background: surface,
              color: text,
              border: `1px solid ${border}`,
            }}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-widest text-green-600">
                  UPDATE EVENT
                </p>
                <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                  Edit your event
                </h2>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={saving}
                className="rounded-full border px-3 py-2"
                style={{ borderColor: border }}
                aria-label="Close edit form"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {[
                {
                  label: "Event Title *",
                  name: "title",
                  placeholder: "Enter event title",
                  required: true,
                },
                {
                  label: "Location *",
                  name: "location",
                  placeholder: "Enter event location",
                  required: true,
                },
                {
                  label: "Image URL",
                  name: "image",
                  placeholder: "https://example.com/image.jpg",
                  type: "url",
                },
              ].map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={`edit-${field.name}`}
                    className="mb-2 block text-sm font-semibold"
                  >
                    {field.label}
                  </label>

                  <input
                    id={`edit-${field.name}`}
                    required={field.required}
                    type={field.type || "text"}
                    name={field.name}
                    value={editForm[field.name]}
                    onChange={handleEditChange}
                    placeholder={field.placeholder}
                    className="w-full min-w-0 rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-green-600"
                    style={{
                      background: bg,
                      color: text,
                      borderColor: border,
                    }}
                  />
                </div>
              ))}

              <div>
                <label
                  htmlFor="edit-type"
                  className="mb-2 block text-sm font-semibold"
                >
                  Event Type *
                </label>

                <select
                  id="edit-type"
                  required
                  name="type"
                  value={editForm.type}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  style={{
                    background: bg,
                    color: text,
                    borderColor: border,
                  }}
                >
                  <option value="">Select type</option>
                  <option value="Donation">Donation</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="Environment">Environment</option>
                  <option value="Education">Education</option>
                  <option value="Community">Community</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-date"
                  className="mb-2 block text-sm font-semibold"
                >
                  Event Date *
                </label>

                <input
                  id="edit-date"
                  required
                  type="date"
                  name="date"
                  value={editForm.date}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  style={{
                    background: bg,
                    color: text,
                    borderColor: border,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-description"
                  className="mb-2 block text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="edit-description"
                  rows={3}
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  placeholder="Write event description..."
                  className="w-full resize-y rounded-xl border px-4 py-3 outline-none"
                  style={{
                    background: bg,
                    color: text,
                    borderColor: border,
                  }}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={saving}
                  className="rounded-full border px-5 py-3 font-semibold disabled:opacity-60"
                  style={{ borderColor: border }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: green }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEWSLETTER */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div
          className="mx-auto max-w-7xl overflow-hidden rounded-3xl px-5 py-12 text-center sm:px-12 sm:py-16"
          style={{ background: dark ? "#283d30" : "#e8eee0" }}
        >
          <p className="text-3xl">✉️</p>

          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
            A little good in your inbox.
          </h2>

          <p
            className="mx-auto mt-3 max-w-xl text-sm leading-7 sm:text-base"
            style={{ color: muted }}
          >
            Get updates on upcoming community events and new ways to give back.
          </p>

          <form
            className="mx-auto mt-7 flex max-w-lg flex-col gap-3 sm:flex-row"
            onSubmit={handleNewsletterSubmit}
          >
            <input
              type="email"
              required
              maxLength={254}
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Your email address"
              aria-label="Your email address"
              autoComplete="email"
              disabled={newsletterLoading}
              className="min-w-0 flex-1 rounded-full border px-5 py-3 outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-60"
              style={{
                background: surface,
                color: text,
                borderColor: border,
              }}
            />

            <button
              type="submit"
              disabled={newsletterLoading}
              className="rounded-full px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: green }}
            >
              {newsletterLoading ? "Subscribing..." : "Subscribe ↗"}
            </button>
          </form>

          <p className="mt-3 text-xs" style={{ color: muted }}>
            Join the Kindora community and stay connected.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t px-4 py-8 sm:px-6"
        style={{ borderColor: border }}
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="text-xl font-extrabold"
            style={{ color: dark ? "#b7d9a8" : green }}
          >
            kindora.
          </Link>

          <p className="text-sm" style={{ color: muted }}>
            Together, we can make good things happen.
          </p>

          <p className="text-xs" style={{ color: muted }}>
            © {new Date().getFullYear()} Kindora. Built for community.
          </p>
        </div>
      </footer>
    </main>
  );
}
