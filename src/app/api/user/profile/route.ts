import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = `${process.env.QF_USER_API_URL}/users/profile`;
  const outgoingHeaders: Record<string, string> = {
    "x-auth-token": token,
    "x-client-id": process.env.QF_CLIENT_ID!,
  };

  console.log("\n========== [DEBUG /api/user/profile] ==========");
  console.log("QF_USER_API_URL env:", process.env.QF_USER_API_URL);
  console.log("Full URL:", url);
  console.log("x-client-id:", outgoingHeaders["x-client-id"]);
  console.log("x-auth-token (first 30 chars):", token.substring(0, 30) + "…");
  console.log("x-auth-token length:", token.length);
  // Check if the token looks like a JWT (3 dot-separated parts)
  const parts = token.split(".");
  console.log("Token format: parts=" + parts.length, parts.length === 3 ? "(looks like JWT)" : "(NOT a JWT)");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      console.log("JWT payload:", JSON.stringify(payload, null, 2));
    } catch {
      console.log("JWT payload: (could not decode)");
    }
  }

  try {
    const res = await fetch(url, { headers: outgoingHeaders });

    const responseText = await res.text();
    console.log("← Status:", res.status);
    console.log("← Response headers:", JSON.stringify(Object.fromEntries(res.headers.entries())));
    console.log("← Body:", responseText.substring(0, 1000));
    console.log("=================================================\n");

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch profile", debug: responseText },
        { status: res.status }
      );
    }

    const data = JSON.parse(responseText);
    // QF wraps the profile in {success, data: {...}} — unwrap so the client gets fields directly
    return NextResponse.json(data.data || data);
  } catch (e) {
    console.error("[profile] Fetch error:", e);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
