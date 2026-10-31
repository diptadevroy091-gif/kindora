"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://kindora-api-vb9y.onrender.com";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warning, error: showError, success } = useToast();

  const [status, setStatus] = useState("Checking your account...");
  const [error, setError] = useState("");

  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    let cancelled = false;
    let redirectTimer;

    async function handleCallback() {
      const linked = searchParams.get("linked");
      const code = searchParams.get("code");
      const oauthError = searchParams.get("error");

      // Existing email/password account already exists.
      if (oauthError === "account_exists_sign_in_and_link") {
        setStatus("Account already exists");

        warning(
          "Account Already Exists! Please sign in using your email and password.",
          4000,
        );

        redirectTimer = window.setTimeout(() => {
          if (!cancelled) {
            router.replace("/login");
          }
        }, 2000);

        return;
      }

      // Other OAuth errors.
      if (oauthError) {
        setError("Google/GitHub authorization was cancelled or failed.");
        setStatus("Sign-in unsuccessful");
        showError("Authorization failed. Please try signing in again.", 4000);
        return;
      }

      // Google account linking.
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

        success("Google account linked successfully!", 3000);

        redirectTimer = window.setTimeout(() => {
          if (!cancelled) router.replace("/");
        }, 1500);

        return;
      }

      if (!code) {
        setError("No authorization code was returned by the provider.");
        setStatus("Sign-in unsuccessful");
        showError("No authorization code was returned.", 4000);
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
          if (
            data.error === "account_exists_sign_in_and_link" ||
            data.code === "account_exists_sign_in_and_link"
          ) {
            setStatus("Account already exists");

            warning(
              "Account Already Exists! Please sign in using your email and password.",
              4000,
            );

            redirectTimer = window.setTimeout(() => {
              if (!cancelled) router.replace("/login");
            }, 2000);

            return;
          }

          throw new Error(
            data.message || data.error || "Could not complete OAuth sign-in.",
          );
        }

        if (cancelled) return;

        sessionStorage.setItem("kindora_token", data.token);

        if (data.user) {
          sessionStorage.setItem("kindora_user", JSON.stringify(data.user));
        }

        window.dispatchEvent(new Event("kindora-auth-change"));

        setStatus("Sign-in successful! Redirecting...");

        success("Welcome to Kindora!", 2000);

        router.replace("/");
      } catch (err) {
        if (!cancelled) {
          setStatus("Sign-in unsuccessful");
          setError(err.message || "An unexpected error occurred.");
          showError(err.message || "Sign-in failed.", 4000);
        }
      }
    }

    handleCallback();

    return () => {
      cancelled = true;

      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [router, searchParams, warning, showError, success]);

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

function CallbackLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-emerald-700">Kindora</h1>
        <p className="mt-4 text-gray-700">Preparing secure sign-in...</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <CallbackContent />
    </Suspense>
  );
}
