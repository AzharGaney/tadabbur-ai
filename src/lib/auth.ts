// OAuth2 PKCE utilities for Quran Foundation authentication

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest("SHA-256", encoder.encode(plain));
}

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function generatePKCE() {
  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64url(hashed);
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return generateRandomString(32);
}

export function generateNonce(): string {
  return generateRandomString(32);
}

const OAUTH_SCOPES = [
  "openid",
  "offline_access",
  "user",
  "collection",
  "bookmark",
  "note",
  "streak",
  "activity_day",
  "reading_session",
  "post",
  "comment",
].join(" ");

export function buildAuthorizeURL(params: {
  codeChallenge: string;
  state: string;
  nonce: string;
}): string {
  const oauthEndpoint =
    process.env.NEXT_PUBLIC_QF_OAUTH_ENDPOINT ||
    "https://prelive-oauth2.quran.foundation";

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/callback`;

  const url = new URL(`${oauthEndpoint}/oauth2/auth`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.NEXT_PUBLIC_QF_CLIENT_ID || process.env.QF_CLIENT_ID || "10d965c6-c552-4628-93d7-732987eae77f");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", OAUTH_SCOPES);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);

  return url.toString();
}

// Store PKCE values in sessionStorage for the callback
export function storePKCEValues(codeVerifier: string, state: string) {
  sessionStorage.setItem("pkce_code_verifier", codeVerifier);
  sessionStorage.setItem("pkce_state", state);
}

export function getPKCEValues() {
  return {
    codeVerifier: sessionStorage.getItem("pkce_code_verifier"),
    state: sessionStorage.getItem("pkce_state"),
  };
}

export function clearPKCEValues() {
  sessionStorage.removeItem("pkce_code_verifier");
  sessionStorage.removeItem("pkce_state");
}

// Token storage (in-memory + localStorage for persistence)
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_at: number; // unix timestamp ms
}

const TOKEN_KEY = "tadabbur_auth_tokens";

export function storeTokens(tokens: AuthTokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function getStoredTokens(): AuthTokens | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenExpired(tokens: AuthTokens): boolean {
  return Date.now() >= tokens.expires_at - 60_000; // 1 min buffer
}
