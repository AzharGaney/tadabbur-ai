"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  type AuthTokens,
  getStoredTokens,
  storeTokens,
  clearTokens,
  isTokenExpired,
} from "@/lib/auth";

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: AuthTokens | null;
  user: UserProfile | null;
  login: () => void;
  logout: () => Promise<void>;
  handleLogin: (tokens: AuthTokens) => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  tokens: null,
  user: null,
  login: () => {},
  logout: async () => {},
  handleLogin: () => {},
  getAccessToken: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use a ref to always have the latest tokens without re-creating callbacks
  const tokensRef = useRef<AuthTokens | null>(null);
  // Mutex: deduplicate concurrent refresh calls
  const refreshPromiseRef = useRef<Promise<AuthTokens | null> | null>(null);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    const stored = getStoredTokens();
    if (stored) {
      console.log("[auth] Loaded stored tokens, expires_at:", new Date(stored.expires_at).toISOString());
      console.log("[auth] Token expired?", isTokenExpired(stored));
      setTokens(stored);
      tokensRef.current = stored;
    }
    setIsLoading(false);
  }, []);

  const refreshAccessToken = useCallback(async (currentTokens: AuthTokens): Promise<AuthTokens | null> => {
    // Deduplicate: if a refresh is already in-flight, wait for it
    if (refreshPromiseRef.current) {
      console.log("[auth] Refresh already in-flight, waiting for existing request");
      return refreshPromiseRef.current;
    }

    const doRefresh = async (): Promise<AuthTokens | null> => {
      try {
        console.log("[auth] Refreshing access token...");
        console.log("[auth] Current token expires_at:", new Date(currentTokens.expires_at).toISOString());
        console.log("[auth] Time now:", new Date().toISOString());
        console.log("[auth] refresh_token present:", !!currentTokens.refresh_token);
        console.log("[auth] refresh_token (first 8 chars):", currentTokens.refresh_token?.slice(0, 8) + "...");

        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: currentTokens.refresh_token }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("[auth] Refresh failed with status:", res.status);
          console.error("[auth] Refresh error details:", errorData);
          return null;
        }

        const data = await res.json();
        console.log("[auth] Refresh succeeded, new expires_in:", data.expires_in);
        console.log("[auth] Got new refresh_token:", !!data.refresh_token);

        const newTokens: AuthTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token || currentTokens.refresh_token,
          id_token: data.id_token || currentTokens.id_token,
          expires_at: Date.now() + (data.expires_in || 3600) * 1000,
        };

        console.log("[auth] New token expires_at:", new Date(newTokens.expires_at).toISOString());

        storeTokens(newTokens);
        setTokens(newTokens);
        tokensRef.current = newTokens;
        return newTokens;
      } catch (err) {
        console.error("[auth] Refresh threw an exception:", err);
        return null;
      }
    };

    refreshPromiseRef.current = doRefresh();
    try {
      return await refreshPromiseRef.current;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Always read the latest tokens from the ref, not from stale closure
    const currentTokens = tokensRef.current;
    if (!currentTokens) {
      console.log("[auth] getAccessToken: no tokens available");
      return null;
    }

    if (isTokenExpired(currentTokens)) {
      console.log("[auth] getAccessToken: token expired, refreshing...");
      const refreshed = await refreshAccessToken(currentTokens);
      if (!refreshed) {
        console.error("[auth] getAccessToken: refresh failed, returning null");
        return null;
      }
      return refreshed.access_token;
    }

    return currentTokens.access_token;
  }, [refreshAccessToken]);

  const login = useCallback(async () => {
    const { generatePKCE, generateState, generateNonce, buildAuthorizeURL, storePKCEValues, clearPKCEValues } =
      await import("@/lib/auth");

    // Clear any stale PKCE values from a previous interrupted attempt
    clearPKCEValues();

    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = generateState();
    const nonce = generateNonce();

    storePKCEValues(codeVerifier, state);

    const url = buildAuthorizeURL({ codeChallenge, state, nonce });
    console.log("[auth] authorize URL:", url);
    window.location.href = url;
  }, []);

  const handleLogin = useCallback((newTokens: AuthTokens) => {
    console.log("[auth] handleLogin: storing new tokens, expires_at:", new Date(newTokens.expires_at).toISOString());
    storeTokens(newTokens);
    setTokens(newTokens);
    tokensRef.current = newTokens;
  }, []);

  const logout = useCallback(async () => {
    console.log("[auth] Logging out, clearing all tokens");
    const { clearPKCEValues } = await import("@/lib/auth");
    clearTokens();
    clearPKCEValues();
    setTokens(null);
    tokensRef.current = null;
    setUser(null);
  }, []);

  // Fetch user profile when tokens are available
  useEffect(() => {
    if (!tokens) {
      setUser(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Use getAccessToken to ensure we have a valid (non-expired) token
        const accessToken = await getAccessToken();
        if (!accessToken || cancelled) return;

        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          // Normalize: QF returns firstName/lastName, build a display name
          const firstName = data.firstName || data.first_name || "";
          const lastName = data.lastName || data.last_name || "";
          const fullName = [firstName, lastName].filter(Boolean).join(" ");
          // Fall back to email prefix if no name fields available
          const emailName = data.email ? data.email.split("@")[0] : undefined;
          setUser({
            id: data.id,
            email: data.email,
            firstName,
            lastName,
            username: data.username,
            name: fullName || data.name || data.username || emailName || undefined,
          });
        }
      } catch {
        // profile fetch is non-critical
      }
    })();
    return () => { cancelled = true; };
  }, [tokens, getAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!tokens,
        isLoading,
        tokens,
        user,
        login,
        logout,
        handleLogin,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
