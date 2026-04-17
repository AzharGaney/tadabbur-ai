// Server-side client_credentials token for Content API access

let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchToken(): Promise<string> {
  const oauthEndpoint = process.env.QF_OAUTH_ENDPOINT!;
  const clientId = process.env.QF_CLIENT_ID!;
  const clientSecret = process.env.QF_CLIENT_SECRET!;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "content",
  });

  const res = await fetch(`${oauthEndpoint}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Content token error:", res.status, error);
    throw new Error(`Failed to get content token: ${error}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.token;
}

export async function getContentToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  return fetchToken();
}

/** Invalidate the cached token so the next call fetches a fresh one */
export function invalidateContentToken() {
  cachedToken = null;
}
