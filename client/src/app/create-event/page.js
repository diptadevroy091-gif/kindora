"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "https://kindora-api-vb9y.onrender.com"}/api/events`;

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

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [token, setToken] = useState("");

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

      // Home page will fetch the latest events.
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
      <main className="flex min-h-screen items-center justify-center bg-[#f8f8f5]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#52764b] border-t-transparent" />
          <p className="text-sm font-medium text-gray-600">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

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
