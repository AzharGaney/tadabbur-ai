"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/discover");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-[var(--text-secondary)]">
            Sign in with your Quran Foundation account to continue your reflection journey.
          </p>
        </div>

        <button
          onClick={login}
          className="w-full rounded-xl bg-emerald-700 px-6 py-3.5 text-white font-medium hover:bg-emerald-600 transition-colors"
        >
          Sign in with Quran Foundation
        </button>

        <p className="text-sm text-[var(--text-tertiary)]">
          Don&apos;t have an account? One will be created when you sign in.
        </p>
      </div>
    </div>
  );
}
