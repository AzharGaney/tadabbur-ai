"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/components/providers/theme-provider";

const navLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/journal", label: "Journal" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/community", label: "Community" },
];

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, login, logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/" || pathname.startsWith("/reflect/")) return null;

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const themeIcon = theme === "dark" ? "\u263E" : theme === "light" ? "\u2600" : "\u25D0";
  const themeLabel = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Auto";

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-emerald-700/95 backdrop-blur-md text-white">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
        <Link href="/" className="font-semibold text-lg tracking-tight text-white">
          Tadabbur <span className="font-light text-gold-400">AI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                pathname.startsWith(link.href)
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={cycleTheme}
            className="rounded-lg p-2 text-sm text-white/70 hover:bg-white/10 transition-colors"
            title={`Theme: ${themeLabel}`}
          >
            {themeIcon}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/80 max-w-[120px] truncate">
                {user?.name || user?.firstName || user?.username || "User"}
              </span>
              <button
                onClick={logout}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="rounded-lg bg-gold-500 px-4 py-1.5 text-sm text-emerald-900 font-medium hover:bg-gold-400 transition-colors"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile: theme + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={cycleTheme}
            className="rounded-lg p-2 text-sm text-white/70"
            title={`Theme: ${themeLabel}`}
          >
            {themeIcon}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-white/80"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-emerald-800 fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-white/15 text-white font-medium"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-white/10 pt-3 mt-2">
              {isAuthenticated ? (
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm text-white/80">{user?.name || user?.firstName || user?.username || "User"}</span>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { login(); setMobileOpen(false); }}
                  className="w-full rounded-lg bg-gold-500 px-4 py-2.5 text-sm text-emerald-900 font-medium hover:bg-gold-400 transition-colors"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
