"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

const API_URL = "https://kindora-api-vb9y.onrender.com/api/events";

export default function UpcomingEvents() {
  const { error: showError, info, success } = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const bg = dark ? "#14231c" : "#faf9f5";
  const surface = dark ? "#1e3027" : "#ffffff";
  const text = dark ? "#f1f5ed" : "#20392c";
  const muted = dark ? "#b8c8bc" : "#68776c";
  const border = dark ? "#35493c" : "#e6e9df";
  const green = dark ? "#496f50" : "#315b43";

  const fetchEvents = useCallback(
    async (showNotification = false) => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL);

        let data;

        try {
          data = await response.json();
        } catch {
          throw new Error("The server returned an invalid response.");
        }

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load events.");
        }

        setEvents(Array.isArray(data.events) ? data.events : []);

        if (showNotification) {
          success("Events refreshed successfully.");
        }
      } catch (err) {
        console.error("Events error:", err);
        setError("Unable to load events. Please try again.");
        showError("Unable to load events. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [showError, success],
  );

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const eventTypes = useMemo(() => {
    const types = events
      .map((event) => event.type)
      .filter((type) => typeof type === "string" && type.trim());

    return ["All", ...new Set(types)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch = [
        event.title,
        event.location,
        event.description,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(searchText),
      );

      const matchesType = selectedType === "All" || event.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [events, search, selectedType]);

  function clearFilters() {
    setSearch("");
    setSelectedType("All");
    info("Search filters cleared.");
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: bg,
        color: text,
        transition: "background .25s, color .25s",
      }}
    >
      {/* NAVBAR */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          background: dark ? "rgba(20,35,28,.94)" : "rgba(250,249,245,.94)",
          borderColor: border,
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 text-2xl font-extrabold tracking-tight"
            style={{ color: dark ? "#b7d9a8" : green }}
            onClick={() => setMenuOpen(false)}
          >
            kindora<span style={{ color: "#d28b54" }}>.</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link href="/" className="transition hover:opacity-70">
              Home
            </Link>

            <Link
              href="/upcoming-events"
              className="font-bold"
              style={{ color: dark ? "#b7d9a8" : green }}
            >
              Upcoming Events
            </Link>

            <Link href="/#about" className="transition hover:opacity-70">
              About Us
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((current) => !current)}
              aria-label={
                dark ? "Switch to light theme" : "Switch to dark theme"
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:opacity-75"
              style={{ borderColor: border }}
            >
              {dark ? "☀️" : "🌙"}
            </button>

            <Link
              href="/create-event"
              className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 sm:inline-flex"
              style={{ background: green }}
            >
              + Create Event
            </Link>

            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border text-xl md:hidden"
              style={{ borderColor: border }}
              aria-label={
                menuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={menuOpen}
            >
              {menuOpen ? "×" : "☰"}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div
            className="border-t px-4 py-4 md:hidden"
            style={{ borderColor: border, background: surface }}
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium hover:opacity-75"
              >
                Home
              </Link>

              <Link
                href="/upcoming-events"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-bold"
                style={{ color: dark ? "#b7d9a8" : green }}
              >
                Upcoming Events
              </Link>

              <Link
                href="/#about"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium hover:opacity-75"
              >
                About Us
              </Link>

              <Link
                href="/create-event"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-xl px-4 py-3 text-center text-sm font-semibold text-white"
                style={{ background: green }}
              >
                + Create Event
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section
        className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
        style={{ background: dark ? "#192920" : "#f0f2e9" }}
      >
        <div className="mx-auto max-w-7xl">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold"
            style={{ borderColor: border, color: muted }}
          >
            ✳ COMMUNITY STARTS HERE
          </div>

          <h1 className="max-w-3xl text-4xl leading-tight font-bold sm:text-5xl md:text-6xl">
            Discover events.
            <br />
            <span style={{ color: "#7b9c69" }}>Make a difference.</span>
          </h1>

          <p
            className="mt-5 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8"
            style={{ color: muted }}
          >
            Find meaningful community events, connect with people, and take
            small steps towards a kinder world.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#event-list"
              className="inline-flex items-center justify-center rounded-full px-6 py-3.5 font-semibold text-white transition hover:opacity-90"
              style={{ background: green }}
            >
              Explore Events ↓
            </a>

            <Link
              href="/create-event"
              className="inline-flex items-center justify-center rounded-full border px-6 py-3.5 font-semibold transition hover:opacity-75"
              style={{ borderColor: border }}
            >
              + Create an Event
            </Link>
          </div>
        </div>
      </section>

      {/* EVENTS */}
      <section
        id="event-list"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      >
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p
              className="text-xs font-bold tracking-[.2em]"
              style={{ color: "#789668" }}
            >
              FIND YOUR PURPOSE
            </p>

            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Upcoming Community Events
            </h2>

            <p className="mt-3" style={{ color: muted }}>
              Discover opportunities to help and connect.
            </p>
          </div>

          <div
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{
              background: dark ? "#304638" : "#e8efe3",
              color: dark ? "#c4e2b8" : green,
            }}
          >
            {events.length} {events.length === 1 ? "Event" : "Events"} Found
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div
          className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border p-4 sm:p-5 md:grid-cols-[1fr_260px]"
          style={{ background: surface, borderColor: border }}
        >
          <div className="min-w-0">
            <label
              htmlFor="event-search"
              className="mb-2 block text-sm font-semibold"
            >
              Search Events
            </label>

            <input
              id="event-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, location..."
              className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-green-700/30"
              style={{
                background: bg,
                color: text,
                borderColor: border,
              }}
            />
          </div>

          <div className="min-w-0">
            <label
              htmlFor="event-type"
              className="mb-2 block text-sm font-semibold"
            >
              Filter by Category
            </label>

            <select
              id="event-type"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-green-700/30"
              style={{
                background: bg,
                color: text,
                borderColor: border,
              }}
            >
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All Categories" : type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* EVENT RESULTS */}
        {loading ? (
          <div className="py-20 text-center" aria-live="polite">
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-current border-r-transparent"
              style={{ color: green }}
              aria-label="Loading"
            />
            <p className="mt-5 text-lg font-semibold">Loading events...</p>
            <p className="mt-2 text-sm" style={{ color: muted }}>
              Please wait a moment.
            </p>
          </div>
        ) : error ? (
          <div
            className="rounded-2xl border p-6 text-center sm:p-10"
            style={{ background: surface, borderColor: border }}
          >
            <p className="text-red-500">{error}</p>

            <button
              type="button"
              onClick={() => fetchEvents(true)}
              className="mt-5 rounded-full px-6 py-3 font-semibold text-white transition hover:opacity-90"
              style={{ background: green }}
            >
              Try Again
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div
            className="rounded-2xl border px-5 py-14 text-center sm:px-6 sm:py-16"
            style={{ background: surface, borderColor: border }}
          >
            <p className="text-5xl" aria-hidden="true">
              🌱
            </p>

            <h3 className="mt-5 text-2xl font-bold">No Events Found</h3>

            <p className="mt-3" style={{ color: muted }}>
              {events.length === 0
                ? "There are no community events yet. Be the first to create one!"
                : "Try another search or category."}
            </p>

            {events.length === 0 ? (
              <Link
                href="/create-event"
                className="mt-6 inline-flex rounded-full px-6 py-3 font-semibold text-white"
                style={{ background: green }}
              >
                + Create an Event
              </Link>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-full border px-6 py-3 font-semibold"
                style={{ borderColor: border }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm" style={{ color: muted }}>
                Showing {filteredEvents.length} of {events.length} events
              </p>

              {(search || selectedType !== "All") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold underline underline-offset-4"
                  style={{ color: dark ? "#b7d9a8" : green }}
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <article
                  key={event._id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ background: surface, borderColor: border }}
                >
                  {/* IMAGE */}
                  <div
                    className="relative h-48 overflow-hidden bg-cover bg-center sm:h-56"
                    style={{
                      backgroundColor: dark ? "#304638" : "#e4e8d8",
                      backgroundImage: event.image
                        ? `url("${String(event.image).replace(/["\\]/g, "")}")`
                        : "none",
                    }}
                    role="img"
                    aria-label={event.title || "Community event"}
                  >
                    {!event.image && (
                      <div className="flex h-full items-center justify-center text-5xl">
                        🌱
                      </div>
                    )}

                    <span
                      className="absolute left-4 top-4 max-w-[85%] truncate rounded-full px-4 py-2 text-xs font-bold"
                      style={{ background: surface, color: text }}
                    >
                      {event.type || "Community"}
                    </span>
                  </div>

                  {/* DETAILS */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="wrap-break-word text-xl font-bold transition group-hover:text-green-700">
                      {event.title || "Community Event"}
                    </h3>

                    <div
                      className="mt-5 space-y-3 text-sm"
                      style={{ color: muted }}
                    >
                      <p className="flex items-start gap-3">
                        <span aria-hidden="true">📍</span>
                        <span className="min-w-0 wrap-break-word">
                          {event.location || "Location not specified"}
                        </span>
                      </p>

                      <p className="flex items-start gap-3">
                        <span aria-hidden="true">📅</span>
                        <span className="min-w-0 wrap-break-word">
                          {event.date || "Date not specified"}
                        </span>
                      </p>
                    </div>

                    {event.description && (
                      <p
                        className="mt-5 wrap-break-word text-sm leading-7"
                        style={{
                          color: muted,
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 4,
                          overflow: "hidden",
                        }}
                      >
                        {event.description}
                      </p>
                    )}

                    <div className="mt-auto pt-6">
                      <Link
                        href={`/events/${event._id}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 sm:w-auto"
                        style={{ background: green }}
                      >
                        View Details <span aria-hidden="true">↗</span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* CALL TO ACTION */}
      <section className="px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
        <div
          className="mx-auto max-w-7xl rounded-3xl px-5 py-12 text-center sm:px-10 sm:py-14 md:px-12"
          style={{ background: dark ? "#283d30" : "#e8eee0" }}
        >
          <p className="text-4xl" aria-hidden="true">
            💚
          </p>

          <h2 className="mt-5 text-2xl font-bold sm:text-3xl">
            Have an idea to make a difference?
          </h2>

          <p
            className="mx-auto mt-4 max-w-xl leading-7"
            style={{ color: muted }}
          >
            Bring your community together. Create an event and inspire others to
            take action.
          </p>

          <Link
            href="/create-event"
            className="mt-7 inline-flex rounded-full px-7 py-3.5 font-semibold text-white transition hover:opacity-90"
            style={{ background: green }}
          >
            + Create Your Event
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t px-4 py-8 sm:px-6 lg:px-8"
        style={{ borderColor: border }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
