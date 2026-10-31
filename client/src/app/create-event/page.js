"use client";

import { useState } from "react";
import Link from "next/link";

const API_URL = "http://localhost:5000/api/events";

const initialForm = {
  title: "",
  type: "Donation",
  location: "",
  date: "",
  image: "",
  description: "",
};

export default function CreateEvent() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          location: form.location.trim(),
          image: form.image.trim(),
          description: form.description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create event.");
      }

      setMessage("Event created successfully!");
      setForm(initialForm);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Make sure your backend is running on port 5000."
          : err.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f8f5] text-[#20251f]">
      {/* Navigation */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-[#52764b]"
          >
            Kindora
          </Link>

          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* Page Content */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#53734f] transition hover:text-[#304b2e]"
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </Link>

          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#66845d]">
              Make a difference
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Create an Event
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-gray-600">
              Bring people together for a good cause. Share your event with the
              Kindora community.
            </p>
          </div>

          {/* Event Form */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            {message && (
              <div
                role="status"
                className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
              >
                <p className="font-semibold">{message}</p>

                <p className="mt-1">
                  Your event has been saved to the database.
                </p>

                <Link
                  href="/"
                  className="mt-3 inline-block font-semibold underline"
                >
                  Go to Home and view events
                </Link>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Title */}
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                />
              </div>

              {/* Event Type and Date */}
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
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
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
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                  />
                </div>
              </div>

              {/* Location */}
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                />
              </div>

              {/* Image URL */}
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                />

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Optional. Paste a publicly accessible image URL.
                </p>
              </div>

              {/* Description */}
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
                  className="w-full resize-y rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#64845d] focus:ring-2 focus:ring-[#64845d]/20"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#52764b] px-6 py-3.5 font-semibold text-white transition hover:bg-[#3f6039] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {loading ? "Creating Event..." : "Create Event →"}
              </button>

              <p className="text-xs text-gray-500">
                Fields marked with * are required.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Kindora. Making a difference together.
      </footer>
    </main>
  );
}
