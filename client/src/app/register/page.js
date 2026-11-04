"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://kindora-api-vb9y.onrender.com";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.74 7.18l7.73 6C44.43 38.05 46.98 31.91 46.98 24.55Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}

function GitHubLogo({ dark }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="currentColor"
      style={{ color: dark ? "#ffffff" : "#24292f" }}
    >
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.08c-3.1.68-3.76-1.31-3.76-1.31-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.76 2.02 3.35 1.38.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.04-1.14 3.04-1.14.61 1.54.23 2.68.12 2.96.71.78 1.14 1.78 1.14 3.01 0 4.29-2.61 5.23-5.1 5.51.4.35.75 1.02.75 2.06v3.05c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { dark, toggleTheme } = useTheme();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const bg = dark ? "#14231c" : "#f7f8f2";
  const surface = dark ? "#1e3027" : "#ffffff";
  const text = dark ? "#f1f5ed" : "#183c2b";
  const muted = dark ? "#b8c8bc" : "#6b7280";
  const border = dark ? "#35493c" : "#e2e8df";
  const inputBg = dark ? "#14231c" : "#ffffff";

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function startOAuth(provider) {
    window.location.assign(`${API_BASE}/api/auth/${provider}`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 8 || form.password.length > 72) {
      setError("Password must be between 8 and 72 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      sessionStorage.setItem("kindora_token", data.token);
      sessionStorage.setItem("kindora_user", JSON.stringify(data.user));

      window.dispatchEvent(new Event("kindora-auth-change"));

      setSuccess("Account created successfully! Redirecting...");

      setTimeout(() => router.push("/"), 1000);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the server. Please try again later."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border px-4 py-3 outline-none transition focus:border-[#477653] focus:ring-2 focus:ring-[#477653]/20";

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-12 transition-colors duration-300"
      style={{ background: bg, color: text }}
    >
      {/* GLOBAL THEME BUTTON */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle color theme"
        className="fixed top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border text-lg shadow-sm transition hover:scale-105"
        style={{
          background: surface,
          color: text,
          borderColor: border,
        }}
      >
        {dark ? "☀️" : "🌙"}
      </button>

      <div
        className="w-full max-w-md rounded-3xl border p-7 shadow-xl transition-colors duration-300 sm:p-10"
        style={{
          background: surface,
          borderColor: border,
        }}
      >
        <Link
          href="/"
          className="text-sm font-semibold hover:underline"
          style={{ color: dark ? "#a8d49a" : "#477653" }}
        >
          ← Back to Kindora
        </Link>

        <div className="mb-7 mt-7 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl"
            style={{
              background: dark ? "#304638" : "#e8f2e5",
            }}
          >
            🌱
          </div>

          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: text }}
          >
            Join Kindora
          </h1>

          <p className="mt-2 text-sm" style={{ color: muted }}>
            Create an account and start making a difference.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl p-3 text-sm"
            style={{
              background: dark ? "#482c30" : "#fef2f2",
              color: dark ? "#fecaca" : "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl p-3 text-sm"
            style={{
              background: dark ? "#263f32" : "#f0fdf4",
              color: dark ? "#bbf7d0" : "#15803d",
            }}
          >
            {success}
          </div>
        )}

        {/* SOCIAL SIGNUP */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => startOAuth("google")}
            className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 font-semibold transition hover:opacity-80"
            style={{
              background: surface,
              color: text,
              borderColor: border,
            }}
          >
            <GoogleLogo />
            Sign up with Google
          </button>

          <button
            type="button"
            onClick={() => startOAuth("github")}
            className="flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 font-semibold transition hover:opacity-80"
            style={{
              background: surface,
              color: text,
              borderColor: border,
            }}
          >
            <GitHubLogo dark={dark} />
            Sign up with GitHub
          </button>
        </div>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1" style={{ background: border }} />

          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: muted }}
          >
            Or register with email
          </span>

          <div className="h-px flex-1" style={{ background: border }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold"
              style={{ color: text }}
            >
              Full name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className={inputClass}
              style={{
                background: inputBg,
                color: text,
                borderColor: border,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold"
              style={{ color: text }}
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={inputClass}
              style={{
                background: inputBg,
                color: text,
                borderColor: border,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold"
              style={{ color: text }}
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={form.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              className={inputClass}
              style={{
                background: inputBg,
                color: text,
                borderColor: border,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#285b3b] px-4 py-3.5 font-bold text-white transition hover:bg-[#1e482e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account →"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm" style={{ color: muted }}>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold hover:underline"
            style={{ color: dark ? "#a8d49a" : "#285b3b" }}
          >
            Log in
          </Link>
        </p>

        <p
          className="mt-5 text-center text-xs leading-5"
          style={{ color: muted }}
        >
          By creating an account, you agree to use Kindora responsibly.
        </p>
      </div>
    </main>
  );
}
