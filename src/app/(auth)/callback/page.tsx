"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPKCEValues, clearPKCEValues, type AuthTokens } from "@/lib/auth";
import { useAuth } from "@/components/providers/auth-provider";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) { setError(`Authentication failed: ${errorParam}`); return; }
    if (!code) { setError("No authorization code received"); return; }

    const { codeVerifier, state } = getPKCEValues();
    if (!codeVerifier || !state) { setError("Missing PKCE values. Please try logging in again."); return; }
    if (returnedState !== state) { setError("State mismatch. Possible CSRF attack. Please try again."); return; }

    (async () => {
      try {
        const res = await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: `${window.location.origin}/callback` }),
        });
        if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.error || "Token exchange failed"); return; }
        const data = await res.json();
        const tokens: AuthTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          id_token: data.id_token,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        };
        handleLogin(tokens);
        clearPKCEValues();
        router.replace("/discover");
      } catch { setError("An unexpected error occurred during authentication."); }
    })();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Authentication Error</h1>
          <p className="text-[var(--text-secondary)] text-sm">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="h-8 w-8 mx-auto rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        <p className="text-[var(--text-secondary)]">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
