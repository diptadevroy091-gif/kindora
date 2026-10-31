"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://localhost:5000/api/events";

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
  const [dark, setDark] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check login status
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
        console.error("Could not read login information:", error);
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

  function handleLogout() {
    sessionStorage.removeItem("kindora_token");
    sessionStorage.removeItem("kindora_user");

    setUser(null);
    window.dispatchEvent(new Event("kindora-auth-change"));

    window.location.href = "/";
  }

  async function fetchEvents() {
    try {
      setEventsLoading(true);
      setEventsError("");

      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load events");
      }

      setEvents(data.events || []);
    } catch (error) {
      console.error("Events fetch error:", error);
      setEventsError("Unable to load events. Please try again.");
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  function handleEditClick(event) {
    setEditingEvent(event);
    setActionError("");

    setEditForm({
      title: event.title || "",
      type: event.type || "",
      location: event.location || "",
      date: event.date || "",
      image: event.image || "",
      description: event.description || "",
    });
  }

  function handleCloseEdit() {
    if (saving) return;

    setEditingEvent(null);
    setEditForm(emptyForm);
    setActionError("");
  }

  function handleEditChange(e) {
    const { name, value } = e.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleUpdate(e) {
    e.preventDefault();

    if (!editingEvent?._id) {
      setActionError("Event ID is missing.");
      return;
    }

    try {
      setSaving(true);
      setActionError("");

      const response = await fetch(`${API_URL}/${editingEvent._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not update event");
      }

      setEvents((previousEvents) =>
        previousEvents.map((event) =>
          event._id === editingEvent._id ? { ...event, ...editForm } : event,
        ),
      );

      setEditingEvent(null);
      setEditForm(emptyForm);

      alert("Event updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      setActionError(error.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event) {
    if (!event._id) {
      alert("Event ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/${event._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not delete event");
      }

      setEvents((previousEvents) =>
        previousEvents.filter((item) => item._id !== event._id),
      );

      alert("Event deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.message || "Delete failed.");
    }
  }

  const bg = dark ? "#14231c" : "#faf9f5";
  const surface = dark ? "#1e3027" : "#ffffff";
  const text = dark ? "#f1f5ed" : "#20392c";
  const muted = dark ? "#b8c8bc" : "#68776c";
  const border = dark ? "#35493c" : "#e6e9df";
  const green = "#315b43";

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
          background: bg,
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <Link
            href="/"
            className="shrink-0 text-2xl font-extrabold tracking-tight"
            style={{ color: dark ? "#b7d9a8" : green }}
          >
            kindora<span style={{ color: "#d28b54" }}>.</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link href="/" className="transition hover:opacity-70">
              Home
            </Link>

            <Link
              href="/upcoming-events"
              className="transition hover:opacity-70"
            >
              Upcoming Events
            </Link>

            <a href="#about" className="transition hover:opacity-70">
              About Us
            </a>

            <Link href="/create-event" className="transition hover:opacity-70">
              Create Event
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((previous) => !previous)}
              aria-label="Toggle color theme"
              className="rounded-full border px-3 py-2 text-sm"
              style={{ borderColor: border }}
            >
              {dark ? "☀️" : "🌙"}
            </button>

            {authChecked && user ? (
              <div className="flex items-center gap-2">
                <span
                  className="hidden max-w-28 truncate text-sm font-semibold sm:inline"
                  title={user.name || "User"}
                >
                  Hi, {user.name || "User"}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border px-4 py-2.5 text-sm font-semibold transition hover:opacity-70"
                  style={{
                    borderColor: border,
                    color: text,
                  }}
                >
                  Logout
                </button>
              </div>
            ) : authChecked ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-white"
                  style={{ background: green }}
                >
                  Login ↗
                </Link>

                <Link
                  href="/register"
                  className="hidden rounded-full border px-4 py-2.5 text-sm font-semibold sm:inline-block"
                  style={{ borderColor: border }}
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div
                className="h-10 w-20 rounded-full"
                style={{ background: border }}
              />
            )}
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24 lg:px-8">
        <div>
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold"
            style={{ borderColor: border, color: muted }}
          >
            <span>✳</span> SMALL ACTS. BIG CHANGE.
          </div>

          <h1 className="text-5xl leading-tight font-bold tracking-tight md:text-6xl lg:text-7xl">
            A little good
            <br />
            goes a <span style={{ color: "#7b9c69" }}>long way.</span>
          </h1>

          <p
            className="mt-6 max-w-lg text-base leading-8"
            style={{ color: muted }}
          >
            Good things happen when we come together. Discover local community
            events, lend a hand, and help build a kinder world.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#upcoming"
              className="rounded-full px-6 py-3.5 font-semibold text-white transition hover:opacity-90"
              style={{ background: green }}
            >
              Explore events ↗
            </a>

            <Link
              href="/create-event"
              className="rounded-full border px-6 py-3.5 font-semibold transition hover:opacity-70"
              style={{ borderColor: border }}
            >
              + Create an event
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-3">
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

        <div className="relative">
          <div
            className="overflow-hidden rounded-4xl p-3"
            style={{ background: dark ? "#283d30" : "#e7ecdf" }}
          >
            <div
              className="min-h-87.5 overflow-hidden rounded-3xl bg-cover bg-center md:min-h-122.5"
              role="img"
              aria-label="Volunteers working together"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=85)",
              }}
            />
          </div>

          <div
            className="absolute right-0 bottom-7 max-w-57.5 rounded-2xl p-4 shadow-xl"
            style={{ background: surface }}
          >
            <p className="text-2xl">🌍</p>
            <p className="mt-2 font-bold">Change starts locally.</p>
            <p className="mt-1 text-xs leading-5" style={{ color: muted }}>
              One event. One community. A better tomorrow.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="about"
        className="px-5 py-16 md:py-20"
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

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Good intentions, real action.
            </h2>

            <p className="mt-3 leading-7" style={{ color: muted }}>
              Making a difference should feel simple. Here is how you can get
              involved.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="rounded-2xl border p-7"
                style={{ background: surface, borderColor: border }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{feature.icon}</span>
                  <span className="text-sm" style={{ color: muted }}>
                    {feature.number}
                  </span>
                </div>

                <h3 className="mt-7 text-xl font-bold">{feature.title}</h3>

                <p className="mt-3 leading-7" style={{ color: muted }}>
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section id="upcoming" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="text-xs font-bold tracking-[.2em]"
              style={{ color: "#789668" }}
            >
              MAKE IT COUNT
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Find your next good thing.
            </h2>

            <p className="mt-3" style={{ color: muted }}>
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
            <p
              className="col-span-full py-10 text-center"
              style={{ color: muted }}
            >
              Loading events...
            </p>
          ) : eventsError ? (
            <div className="col-span-full py-10 text-center">
              <p className="text-red-500">{eventsError}</p>

              <button
                type="button"
                onClick={fetchEvents}
                className="mt-4 rounded-full border px-5 py-2 text-sm"
                style={{ borderColor: border }}
              >
                Try again
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

              <p className="mt-2" style={{ color: muted }}>
                Be the first to create a community event!
              </p>

              <Link
                href="/create-event"
                className="mt-5 inline-block rounded-full px-6 py-3 font-semibold text-white"
                style={{ background: green }}
              >
                + Create an event
              </Link>
            </div>
          ) : (
            events.slice(0, 3).map((event) => (
              <article
                key={event._id || event.title}
                className="overflow-hidden rounded-2xl border"
                style={{ background: surface, borderColor: border }}
              >
                <div
                  className="h-52 bg-cover bg-center"
                  role="img"
                  aria-label={event.title || "Community event"}
                  style={{
                    backgroundColor: "#e4e8d8",
                    backgroundImage: event.image
                      ? `url("${event.image}")`
                      : "none",
                  }}
                />

                <div className="flex min-h-60 flex-col p-5">
                  <span
                    className="w-fit rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: dark ? "#304638" : "#e8efe3",
                      color: dark ? "#c4e2b8" : green,
                    }}
                  >
                    {event.type || "Community"}
                  </span>

                  <h3 className="mt-4 text-lg font-bold">{event.title}</h3>

                  <p className="mt-2 text-sm" style={{ color: muted }}>
                    📍 {event.location}
                  </p>

                  <p className="mt-2 text-sm" style={{ color: muted }}>
                    📅 {event.date}
                  </p>

                  {event.description && (
                    <p
                      className="mt-3 text-sm leading-6"
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

                    <button
                      type="button"
                      onClick={() => handleEditClick(event)}
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition hover:opacity-70"
                      style={{ borderColor: border }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(event)}
                      className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                    >
                      🗑 Delete
                    </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleCloseEdit();
          }}
        >
          <div
            className="my-8 w-full max-w-xl rounded-3xl p-6 shadow-2xl"
            style={{ background: surface, color: text }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-green-600">
                  UPDATE EVENT
                </p>
                <h2 className="mt-2 text-2xl font-bold">Edit your event</h2>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={saving}
                className="rounded-full border px-3 py-2"
                style={{ borderColor: border }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Event Title *
                </label>
                <input
                  required
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  placeholder="Enter event title"
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  style={{ background: bg, color: text, borderColor: border }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Event Type *
                </label>
                <select
                  required
                  name="type"
                  value={editForm.type}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  style={{ background: bg, color: text, borderColor: border }}
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
                <label className="mb-2 block text-sm font-semibold">
                  Location *
                </label>
                <input
                  required
                  name="location"
                  value={editForm.location}
                  onChange={handleEditChange}
                  placeholder="Enter event location"
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  style={{ background: bg, color: text, borderColor: border }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Event Date *
                </label>
                <input
                  required
                  type="date"
                  name="date"
                  value={editForm.date}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  style={{ background: bg, color: text, borderColor: border }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Image URL
                </label>
                <input
                  type="url"
                  name="image"
                  value={editForm.image}
                  onChange={handleEditChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  style={{ background: bg, color: text, borderColor: border }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Description
                </label>
                <textarea
                  rows={3}
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  placeholder="Write event description..."
                  className="w-full rounded-xl border px-4 py-3 outline-none"
                  style={{ background: bg, color: text, borderColor: border }}
                />
              </div>

              {actionError && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {actionError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={saving}
                  className="rounded-full border px-5 py-3 font-semibold"
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
      <section className="px-5 pb-20">
        <div
          className="mx-auto max-w-7xl overflow-hidden rounded-3xl px-6 py-12 text-center md:px-12 md:py-16"
          style={{ background: dark ? "#283d30" : "#e8eee0" }}
        >
          <p className="text-3xl">✉️</p>

          <h2 className="mt-4 text-3xl font-bold">
            A little good in your inbox.
          </h2>

          <p
            className="mx-auto mt-3 max-w-xl leading-7"
            style={{ color: muted }}
          >
            Get updates on upcoming community events and new ways to give back.
          </p>

          <form
            className="mx-auto mt-7 flex max-w-lg flex-col gap-3 sm:flex-row"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="Your email address"
              aria-label="Your email address"
              className="min-w-0 flex-1 rounded-full border px-5 py-3 outline-none"
              style={{ background: surface, color: text, borderColor: border }}
            />

            <button
              type="submit"
              className="rounded-full px-6 py-3 font-semibold text-white"
              style={{ background: green }}
            >
              Subscribe ↗
            </button>
          </form>

          <p className="mt-3 text-xs" style={{ color: muted }}>
            Newsletter preview only — no emails are sent yet.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-5 py-8" style={{ borderColor: border }}>
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
