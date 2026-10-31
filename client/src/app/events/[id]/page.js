"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = "http://localhost:5000/api/events";

export default function EventDetails() {
  const params = useParams();
  const id = params.id;

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  const bg = dark ? "#14231c" : "#faf9f5";
  const surface = dark ? "#1e3027" : "#ffffff";
  const text = dark ? "#f1f5ed" : "#20392c";
  const muted = dark ? "#b8c8bc" : "#68776c";
  const border = dark ? "#35493c" : "#e6e9df";
  const green = "#315b43";

  useEffect(() => {
    if (!id) return;

    async function fetchEvent() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load event");
        }

        const foundEvent = (data.events || []).find(
          (item) => String(item._id) === String(id),
        );

        if (!foundEvent) {
          throw new Error("Event not found.");
        }

        setEvent(foundEvent);
      } catch (err) {
        console.error("Event details error:", err);
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id]);

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

          <div className="flex items-center gap-3">
            <a
              href="/upcoming-events"
              className="hidden text-sm font-semibold sm:block"
            >
              Upcoming Events
            </a>

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

      {/* MAIN CONTENT */}
      <section className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <a
          href="/upcoming-events"
          className="inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: dark ? "#b7d9a8" : green }}
        >
          ← Back to Upcoming Events
        </a>

        {loading ? (
          <div className="py-24 text-center">
            <p className="text-xl font-semibold">Loading event details...</p>
          </div>
        ) : error ? (
          <div
            className="mt-10 rounded-2xl border p-10 text-center"
            style={{
              background: surface,
              borderColor: border,
            }}
          >
            <p className="text-5xl">😕</p>

            <h1 className="mt-5 text-2xl font-bold">Event Not Found</h1>

            <p className="mt-3" style={{ color: muted }}>
              {error}
            </p>

            <a
              href="/upcoming-events"
              className="mt-6 inline-block rounded-full px-6 py-3 font-semibold text-white"
              style={{ background: green }}
            >
              Browse Events
            </a>
          </div>
        ) : event ? (
          <article
            className="mt-8 overflow-hidden rounded-3xl border"
            style={{
              background: surface,
              borderColor: border,
            }}
          >
            {/* EVENT IMAGE */}
            <div
              className="relative h-64 bg-cover bg-center sm:h-96 md:h-112"
              style={{
                backgroundColor: "#e4e8d8",
                backgroundImage: event.image ? `url("${event.image}")` : "none",
              }}
              role="img"
              aria-label={event.title}
            >
              {!event.image && (
                <div className="flex h-full items-center justify-center text-7xl">
                  🌱
                </div>
              )}

              <span
                className="absolute top-5 left-5 rounded-full px-5 py-2 text-sm font-bold"
                style={{
                  background: surface,
                  color: text,
                }}
              >
                {event.type || "Community"}
              </span>
            </div>

            {/* EVENT INFORMATION */}
            <div className="p-6 sm:p-10">
              <p
                className="text-xs font-bold tracking-[.2em]"
                style={{ color: "#789668" }}
              >
                COMMUNITY EVENT
              </p>

              <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
                {event.title}
              </h1>

              {/* DATE AND LOCATION */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div
                  className="rounded-2xl border p-5"
                  style={{ borderColor: border }}
                >
                  <p className="text-2xl">📅</p>

                  <p className="mt-3 text-sm" style={{ color: muted }}>
                    Event Date
                  </p>

                  <p className="mt-1 font-bold">
                    {event.date || "Not specified"}
                  </p>
                </div>

                <div
                  className="rounded-2xl border p-5"
                  style={{ borderColor: border }}
                >
                  <p className="text-2xl">📍</p>

                  <p className="mt-3 text-sm" style={{ color: muted }}>
                    Event Location
                  </p>

                  <p className="mt-1 font-bold">
                    {event.location || "Not specified"}
                  </p>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div className="mt-10">
                <h2 className="text-2xl font-bold">About This Event</h2>

                <p
                  className="mt-4 whitespace-pre-line text-base leading-8"
                  style={{ color: muted }}
                >
                  {event.description ||
                    "No description has been added for this event yet."}
                </p>
              </div>

              {/* EVENT CATEGORY */}
              <div
                className="mt-8 border-t pt-7"
                style={{ borderColor: border }}
              >
                <p className="text-sm" style={{ color: muted }}>
                  Event Category
                </p>

                <span
                  className="mt-3 inline-block rounded-full px-4 py-2 text-sm font-semibold"
                  style={{
                    background: dark ? "#304638" : "#e8efe3",
                    color: dark ? "#c4e2b8" : green,
                  }}
                >
                  {event.type || "Community"}
                </span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href="/upcoming-events"
                  className="rounded-full px-6 py-3.5 font-semibold text-white"
                  style={{ background: green }}
                >
                  Explore More Events ↗
                </a>

                <a
                  href="/"
                  className="rounded-full border px-6 py-3.5 font-semibold"
                  style={{ borderColor: border }}
                >
                  Back to Home
                </a>
              </div>
            </div>
          </article>
        ) : null}
      </section>

      {/* FOOTER */}
      <footer
        className="mt-10 border-t px-5 py-8"
        style={{ borderColor: border }}
      >
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
