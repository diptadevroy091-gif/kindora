"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE = "https://kindora-api-vb9y.onrender.com";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing your sign in...");

  useEffect(() => {
    let cancelled = false;

    async function completeLogin() {
      const code = searchParams.get("code");
      const oauthError = searchParams.get("error");

      if (oauthError || !code) {
        setMessage("Sign in was cancelled or could not be completed.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/oauth/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to complete sign in.");
        }

        if (cancelled) return;

        sessionStorage.setItem("kindora_token", data.token);
        sessionStorage.setItem("kindora_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("kindora-auth-change"));

        router.replace("/");
      } catch (error) {
        if (!cancelled) {
          setMessage(error.message || "Sign in failed. Please try again.");
        }
      }
    }

    completeLogin();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f2] px-4 text-[#183c2b]">
      <div className="w-full max-w-md rounded-3xl border border-[#e2e8df] bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f2e5] text-3xl">
          🌱
        </div>
        <h1 className="text-2xl font-bold">Kindora</h1>
        <p role="status" className="mt-3 text-sm text-gray-600">
          {message}
        </p>
        {message !== "Completing your sign in..." && (
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="mt-6 rounded-xl bg-[#285b3b] px-5 py-3 font-semibold text-white hover:bg-[#1e482e]"
          >
            Back to login
          </button>
        )}
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return <CallbackContent />;
}
