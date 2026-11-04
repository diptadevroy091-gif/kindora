"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { useTheme } from "@/components/ThemeProvider";

const API_URL = `${
  process.env.NEXT_PUBLIC_API_URL || "https://kindora-api-vb9y.onrender.com"
}/api/events`;

const initialForm = {
  title: "",
  type: "Donation",
  location: "",
  date: "",
  image: "",
  description: "",
};

export default function CreateEvent() {
  const router = useRouter();
  const { success, error, warning } = useToast();
  const { dark, toggleTheme } = useTheme();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [token, setToken] = useState("");

  // THEME COLORS
  const bg = dark ? "#14231c" : "#f8f8f5";
  const surface = dark ? "#1e3027" : "#ffffff";
  const text = dark ? "#f1f5ed" : "#20251f";
  const muted = dark ? "#b8c8bc" : "#68776c";
  const subtle = dark ? "#91a497" : "#89958b";
  const border = dark ? "#35493c" : "#e5e7eb";
  const inputBg = dark ? "#14231c" : "#ffffff";
  const green = dark ? "#a8d49a" : "#52764b";

  // ==========================================
  // AUTHENTICATION GUARD
  // ==========================================

  useEffect(() => {
    const storedToken = sessionStorage.getItem("kindora_token");

    if (!storedToken) {
      warning("Please login first to create an event.");

      router.replace("/login?redirect=/create-event");
      return;
    }

    setToken(storedToken);
    setCheckingAuth(false);
  }, [router, warning]);

  // ==========================================
  // FORM CHANGE
  // ==========================================

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // ==========================================
  // CREATE EVENT
  // ==========================================

  async function handleSubmit(e) {
    e.preventDefault();

    if (!token) {
      warning("Please login first to create an event.");
      router.replace("/login?redirect=/create-event");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          type: form.type.trim(),
          location: form.location.trim(),
          date: form.date,
          image: form.image.trim(),
          description: form.description.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem("kindora_token");
        sessionStorage.removeItem("kindora_user");

        window.dispatchEvent(new Event("kindora-auth-change"));

        error("Your session has expired. Please login again.");

        router.replace("/login?redirect=/create-event");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create event.");
      }

      setForm(initialForm);

      success("Event created successfully!");

      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (err) {
      console.error("Create event error:", err);

      error(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Please try again."
          : err.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // AUTH CHECK SCREEN
  // ==========================================

  if (checkingAuth) {
    return (
      <main
        className="flex min-h-screen items-center justify-center transition-colors duration-300"
        style={{ background: bg, color: text }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: green, borderTopColor: "transparent" }}
          />

          <p className="text-sm font-medium" style={{ color: muted }}>
            Checking your account...
          </p>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="fixed top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm"
          style={{
            background: surface,
            borderColor: border,
          }}
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </main>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <main
      className="min-h-screen transition-colors duration-300"
      style={{ background: bg, color: text }}
    >
      {/* NAVIGATION */}

      <header
        className="border-b transition-colors duration-300"
        style={{
          borderColor: border,
          background: surface,
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight"
            style={{ color: green }}
          >
            Kindora<span className="text-[#d28b54]">.</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* THEME BUTTON */}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-sm transition hover:scale-105"
              style={{
                background: bg,
                color: text,
                borderColor: border,
              }}
            >
              {dark ? "☀️" : "🌙"}
            </button>

            <Link
              href="/"
              className="rounded-lg px-4 py-2 text-sm font-medium transition"
              style={{
                color: muted,
                background: bg,
              }}
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-75"
            style={{ color: green }}
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </Link>

          {/* PAGE HEADING */}

          <div className="mb-8">
            <p
              className="mb-3 text-sm font-semibold uppercase tracking-[0.2em]"
              style={{ color: green }}
            >
              Make a difference
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Create an Event
            </h1>

            <p
              className="mt-4 max-w-xl text-base leading-7"
              style={{ color: muted }}
            >
              Bring people together for a good cause. Share your event with the
              Kindora community.
            </p>
          </div>

          {/* EVENT FORM */}

          <div
            className="rounded-2xl border p-5 shadow-sm transition-colors duration-300 sm:p-8"
            style={{
              background: surface,
              borderColor: border,
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* EVENT TITLE */}

              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-semibold"
                >
                  Event Title *
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Winter Clothes for Everyone"
                  required
                  maxLength={120}
                  className="w-full rounded-xl border px-4 py-3 outline-none transition focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                  style={{
                    background: inputBg,
                    color: text,
                    borderColor: border,
                  }}
                />
              </div>

              {/* EVENT TYPE AND DATE */}

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="type"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Event Type *
                  </label>

                  <select
                    id="type"
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border px-4 py-3 outline-none transition focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                    style={{
                      background: inputBg,
                      color: text,
                      borderColor: border,
                    }}
                  >
                    <option value="Donation">Donation</option>
                    <option value="Volunteering">Volunteering</option>
                    <option value="Community">Community</option>
                    <option value="Fundraising">Fundraising</option>
                    <option value="Environment">Environment</option>
                    <option value="Education">Education</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="date"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Event Date *
                  </label>

                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border px-4 py-3 outline-none transition focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                    style={{
                      background: inputBg,
                      color: text,
                      borderColor: border,
                      colorScheme: dark ? "dark" : "light",
                    }}
                  />
                </div>
              </div>

              {/* LOCATION */}

              <div>
                <label
                  htmlFor="location"
                  className="mb-2 block text-sm font-semibold"
                >
                  Location *
                </label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Mirpur 10, Dhaka"
                  required
                  maxLength={200}
                  className="w-full rounded-xl border px-4 py-3 outline-none transition focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                  style={{
                    background: inputBg,
                    color: text,
                    borderColor: border,
                  }}
                />
              </div>

              {/* IMAGE URL */}

              <div>
                <label
                  htmlFor="image"
                  className="mb-2 block text-sm font-semibold"
                >
                  Image URL
                </label>

                <input
                  id="image"
                  name="image"
                  type="url"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="https://example.com/event-image.jpg"
                  className="w-full rounded-xl border px-4 py-3 outline-none transition focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                  style={{
                    background: inputBg,
                    color: text,
                    borderColor: border,
                  }}
                />

                <p className="mt-2 text-xs leading-5" style={{ color: subtle }}>
                  Optional. Paste a publicly accessible image URL.
                </p>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-semibold"
                >
                  Event Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Tell people what your event is about..."
                  rows={5}
                  maxLength={2000}
                  className="w-full resize-y rounded-xl border px-4 py-3 outline-none transition focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                  style={{
                    background: inputBg,
                    color: text,
                    borderColor: border,
                  }}
                />
              </div>

              {/* SUBMIT BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-6 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                style={{ background: "#52764b" }}
              >
                {loading ? "Creating Event..." : "Create Event →"}
              </button>

              <p className="text-xs" style={{ color: subtle }}>
                Fields marked with * are required.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer
        className="border-t px-4 py-6 text-center text-sm transition-colors duration-300"
        style={{
          borderColor: border,
          background: surface,
          color: subtle,
        }}
      >
        © {new Date().getFullYear()} Kindora. Making a difference together.
      </footer>
    </main>
  );
}
