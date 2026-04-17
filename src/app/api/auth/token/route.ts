import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code, code_verifier, redirect_uri } = await req.json();

  if (!code || !code_verifier) {
    return NextResponse.json({ error: "Missing code or code_verifier" }, { status: 400 });
  }

  const oauthEndpoint = process.env.QF_OAUTH_ENDPOINT!;
  const clientId = process.env.QF_CLIENT_ID!;
  const clientSecret = process.env.QF_CLIENT_SECRET!;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier,
    redirect_uri: redirect_uri || process.env.QF_REDIRECT_URI!,
  });

  const tokenRes = await fetch(`${oauthEndpoint}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    console.error("Token exchange failed:", error);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: tokenRes.status }
    );
  }

  const data = await tokenRes.json();
  return NextResponse.json(data);
}
