import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    console.error("[auth/refresh] Failed to parse request body");
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { refresh_token } = body;

  if (!refresh_token) {
    console.error("[auth/refresh] Missing refresh_token in request body");
    return NextResponse.json({ error: "Missing refresh_token" }, { status: 400 });
  }

  const oauthEndpoint = process.env.QF_OAUTH_ENDPOINT!;
  const clientId = process.env.QF_CLIENT_ID!;
  const clientSecret = process.env.QF_CLIENT_SECRET!;

  console.log("[auth/refresh] Refreshing token via", `${oauthEndpoint}/oauth2/token`);
  console.log("[auth/refresh] client_id:", clientId);
  console.log("[auth/refresh] refresh_token (first 8 chars):", refresh_token.slice(0, 8) + "...");

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: clientId,
  });

  console.log("[auth/refresh] Request body:", params.toString().replace(refresh_token, refresh_token.slice(0, 8) + "..."));

  const tokenRes = await fetch(`${oauthEndpoint}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    console.error("[auth/refresh] Token refresh failed with status:", tokenRes.status);
    console.error("[auth/refresh] Response body:", error);
    return NextResponse.json(
      { error: "Token refresh failed", details: error },
      { status: tokenRes.status }
    );
  }

  const data = await tokenRes.json();
  console.log("[auth/refresh] Token refresh successful, new expires_in:", data.expires_in);
  console.log("[auth/refresh] Got new refresh_token:", !!data.refresh_token);
  return NextResponse.json(data);
}
