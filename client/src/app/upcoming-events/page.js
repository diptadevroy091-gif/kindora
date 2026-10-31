"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api/events";

export default function UpcomingEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [dark, setDark] = useState(false);

  // THEME COLORS
  const bg = dark ? "#14231c" : "#faf9f5";
  const surface = dark ? "#1e3027" : "#ffffff";
  const text = dark ? "#f1f5ed" : "#20392c";
  const muted = dark ? "#b8c8bc" : "#68776c";
  const border = dark ? "#35493c" : "#e6e9df";
  const green = "#315b43";

  // FETCH EVENTS
  async function fetchEvents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load events");
      }

      setEvents(data.events || []);
    } catch (err) {
      console.error("Events error:", err);
      setError("Unable to load events. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  // EVENT TYPES
  const eventTypes = useMemo(() => {
    const types = events.map((event) => event.type).filter(Boolean);

    return ["All", ...new Set(types)];
  }, [events]);

  // SEARCH AND FILTER
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        (event.title || "").toLowerCase().includes(searchText) ||
        (event.location || "").toLowerCase().includes(searchText) ||
        (event.description || "").toLowerCase().includes(searchText);

      const matchesType = selectedType === "All" || event.type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [events, search, selectedType]);

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
        className="sticky top-0 z-20 border-b"
        style={{
          background: bg,
          borderColor: border,
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <a
            href="/"
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: dark ? "#b7d9a8" : green }}
          >
            kindora<span style={{ color: "#d28b54" }}>.</span>
          </a>

          <div className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="/" className="hover:opacity-70">
              Home
            </a>

            <a
              href="/upcoming-events"
              className="font-bold"
              style={{ color: dark ? "#b7d9a8" : green }}
            >
              Upcoming Events
            </a>

            <a href="/#about" className="hover:opacity-70">
              About Us
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDark(!dark)}
              aria-label="Toggle theme"
              className="rounded-full border px-3 py-2"
              style={{ borderColor: border }}
            >
              {dark ? "☀️" : "🌙"}
            </button>

            <a
              href="/create-event"
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: green }}
            >
              + Create Event
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section
        className="px-5 py-16 md:py-24"
        style={{
          background: dark ? "#192920" : "#f0f2e9",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div
            className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold"
            style={{
              borderColor: border,
              color: muted,
            }}
          >
            ✳ COMMUNITY STARTS HERE
          </div>

          <h1 className="max-w-3xl text-4xl leading-tight font-bold md:text-6xl">
            Discover events.
            <br />
            <span style={{ color: "#7b9c69" }}>Make a difference.</span>
          </h1>

          <p
            className="mt-5 max-w-2xl text-base leading-8 md:text-lg"
            style={{ color: muted }}
          >
            Find meaningful community events, connect with people, and take
            small steps towards a kinder world.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#event-list"
              className="rounded-full px-6 py-3.5 font-semibold text-white"
              style={{ background: green }}
            >
              Explore Events ↓
            </a>

            <a
              href="/create-event"
              className="rounded-full border px-6 py-3.5 font-semibold"
              style={{ borderColor: border }}
            >
              + Create an Event
            </a>
          </div>
        </div>
      </section>

      {/* EVENTS SECTION */}
      <section id="event-list" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        {/* SECTION HEADING */}
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="text-xs font-bold tracking-[.2em]"
              style={{ color: "#789668" }}
            >
              FIND YOUR PURPOSE
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
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
            {events.length} Events Found
          </div>
        </div>

        {/* SEARCH AND FILTER */}
        <div
          className="mb-9 flex flex-col gap-4 rounded-2xl border p-4 md:flex-row"
          style={{
            background: surface,
            borderColor: border,
          }}
        >
          <div className="flex-1">
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, location..."
              className="w-full rounded-xl border px-4 py-3 outline-none"
              style={{
                background: bg,
                color: text,
                borderColor: border,
              }}
            />
          </div>

          <div className="w-full md:w-64">
            <label
              htmlFor="event-type"
              className="mb-2 block text-sm font-semibold"
            >
              Filter by Category
            </label>

            <select
              id="event-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none"
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

        {/* EVENT LIST */}
        {loading ? (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold">Loading events...</p>

            <p className="mt-2 text-sm" style={{ color: muted }}>
              Please wait a moment.
            </p>
          </div>
        ) : error ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{ borderColor: border }}
          >
            <p className="text-red-500">{error}</p>

            <button
              type="button"
              onClick={fetchEvents}
              className="mt-5 rounded-full px-6 py-3 font-semibold text-white"
              style={{ background: green }}
            >
              Try Again
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div
            className="rounded-2xl border px-6 py-16 text-center"
            style={{
              background: surface,
              borderColor: border,
            }}
          >
            <p className="text-5xl">🌱</p>

            <h3 className="mt-5 text-2xl font-bold">No Events Found</h3>

            <p className="mt-3" style={{ color: muted }}>
              {events.length === 0
                ? "There are no community events yet. Be the first to create one!"
                : "Try another search or category."}
            </p>

            {events.length === 0 ? (
              <a
                href="/create-event"
                className="mt-6 inline-block rounded-full px-6 py-3 font-semibold text-white"
                style={{ background: green }}
              >
                + Create an Event
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedType("All");
                }}
                className="mt-6 rounded-full border px-6 py-3 font-semibold"
                style={{ borderColor: border }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm" style={{ color: muted }}>
              Showing {filteredEvents.length} of {events.length} events
            </p>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <article
                  key={event._id}
                  className="group overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    background: surface,
                    borderColor: border,
                  }}
                >
                  {/* EVENT IMAGE */}
                  <div
                    className="relative h-56 overflow-hidden bg-cover bg-center"
                    style={{
                      backgroundColor: "#e4e8d8",
                      backgroundImage: event.image
                        ? `url("${event.image}")`
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
                      className="absolute top-4 left-4 rounded-full px-4 py-2 text-xs font-bold"
                      style={{
                        background: surface,
                        color: text,
                      }}
                    >
                      {event.type || "Community"}
                    </span>
                  </div>

                  {/* EVENT DETAILS */}
                  <div className="flex min-h-64 flex-col p-6">
                    <h3 className="text-xl font-bold transition group-hover:text-green-700">
                      {event.title}
                    </h3>

                    <div
                      className="mt-5 space-y-3 text-sm"
                      style={{ color: muted }}
                    >
                      <p className="flex items-start gap-3">
                        <span>📍</span>
                        <span>
                          {event.location || "Location not specified"}
                        </span>
                      </p>

                      <p className="flex items-start gap-3">
                        <span>📅</span>
                        <span>{event.date || "Date not specified"}</span>
                      </p>
                    </div>

                    {event.description && (
                      <p
                        className="mt-5 text-sm leading-7"
                        style={{ color: muted }}
                      >
                        {event.description}
                      </p>
                    )}

                    {/* VIEW DETAILS BUTTON */}
                    <div className="mt-auto pt-6">
                      <a
                        href={`/events/${event._id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                        style={{ background: green }}
                      >
                        View Details <span>↗</span>
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* CALL TO ACTION */}
      <section className="px-5 pb-20">
        <div
          className="mx-auto max-w-7xl rounded-3xl px-6 py-14 text-center md:px-12"
          style={{
            background: dark ? "#283d30" : "#e8eee0",
          }}
        >
          <p className="text-4xl">💚</p>

          <h2 className="mt-5 text-3xl font-bold">
            Have an idea to make a difference?
          </h2>

          <p
            className="mx-auto mt-4 max-w-xl leading-7"
            style={{ color: muted }}
          >
            Bring your community together. Create an event and inspire others to
            take action.
          </p>

          <a
            href="/create-event"
            className="mt-7 inline-flex rounded-full px-7 py-3.5 font-semibold text-white transition hover:opacity-90"
            style={{ background: green }}
          >
            + Create Your Event
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t px-5 py-8" style={{ borderColor: border }}>
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <a
            href="/"
            className="text-xl font-extrabold"
            style={{ color: dark ? "#b7d9a8" : green }}
          >
            kindora.
          </a>

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
