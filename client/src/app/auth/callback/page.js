"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://kindora-api-vb9y.onrender.com";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState("Checking your account...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      const linked = searchParams.get("linked");
      const code = searchParams.get("code");
      const oauthError = searchParams.get("error");

      if (oauthError) {
        setError("Google/GitHub authorization was cancelled or failed.");
        setStatus("Sign-in unsuccessful");
        return;
      }

      // Account linking does not need a new login token.
      if (linked === "google") {
        const existingToken = sessionStorage.getItem("kindora_token");

        if (!existingToken) {
          setError(
            "Google was linked, but your existing login session was not found. Please sign in again.",
          );
          setStatus("Linking completed");
          return;
        }

        setStatus("Google account linked successfully!");

        window.setTimeout(() => {
          if (!cancelled) {
            router.replace("/");
          }
        }, 1500);

        return;
      }

      if (!code) {
        setError("No authorization code was returned by the provider.");
        setStatus("Sign-in unsuccessful");
        return;
      }

      try {
        setStatus("Completing sign-in...");

        const response = await fetch(`${API_BASE}/api/auth/oauth/exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok || !data.token) {
          throw new Error(
            data.message || data.error || "Could not complete OAuth sign-in.",
          );
        }

        sessionStorage.setItem("kindora_token", data.token);

        if (data.user) {
          sessionStorage.setItem("kindora_user", JSON.stringify(data.user));
        }

        window.dispatchEvent(new Event("kindora-auth-change"));

        setStatus("Sign-in successful! Redirecting...");

        if (!cancelled) {
          router.replace("/");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("Sign-in unsuccessful");
          setError(err.message || "An unexpected error occurred.");
        }
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-700">Kindora</h1>

        <p className="mt-4 text-gray-700">{status}</p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {error && (
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-5 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
          >
            Return to login
          </button>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return <CallbackContent />;
}
