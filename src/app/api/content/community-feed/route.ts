import { NextRequest, NextResponse } from "next/server";
import { getContentToken, invalidateContentToken } from "@/lib/content-token";
import { getCachedFeed, setCachedFeed } from "@/lib/feed-cache";

const FEED_URL = `${process.env.QF_REFLECT_API_URL || "https://apis-prelive.quran.foundation/quran-reflect/v1"}/posts/feed`;
const FETCH_TIMEOUT = 35_000; // 35s timeout — QR API is very slow

interface QRPost {
  id: number;
  body: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  commentsCount?: number;
  likesCount?: number;
  [key: string]: unknown;
}

function normalizePosts(raw: QRPost[]) {
  return raw.map((p) => ({
    id: String(p.id),
    body: p.body,
    author: { name: p.authorName || "Community Member" },
    likes_count: p.likesCount || 0,
    comments_count: p.commentsCount || 0,
    created_at: p.createdAt || p.publishedAt || p.updatedAt || "",
  }));
}

async function fetchFeed(token: string) {
  console.log("[community-feed] →", FEED_URL);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(FEED_URL, {
      headers: {
        "x-auth-token": token,
        "x-client-id": process.env.QF_CLIENT_ID!,
      },
      signal: controller.signal,
    });
    const resBody = await res.text();
    console.log("[community-feed] ←", res.status, resBody.substring(0, 300));
    return { res, resBody };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  // Serve from cache if fresh (unless ?refresh=true is passed)
  const skipCache = req.nextUrl.searchParams.get("refresh") === "true";
  const cached = getCachedFeed();
  if (cached && !skipCache) {
    console.log("[community-feed] serving from cache");
    return new NextResponse(cached.data, {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (skipCache) {
    console.log("[community-feed] cache bypassed via ?refresh=true");
  }

  try {
    const userToken = req.headers.get("authorization")?.replace("Bearer ", "");

    let resBody: string | null = null;

    if (userToken) {
      console.log("[community-feed] using user token");
      try {
        const result = await fetchFeed(userToken);
        if (result.res.ok) resBody = result.resBody;
        else console.log("[community-feed] user token failed, trying content token...");
      } catch (e) {
        console.log("[community-feed] user token fetch error:", e instanceof Error ? e.message : e);
      }
    }

    if (!resBody) {
      let token = await getContentToken();
      try {
        let result = await fetchFeed(token);
        if (result.res.status === 401 || result.res.status === 403) {
          console.log("[community-feed] content token expired, refreshing...");
          invalidateContentToken();
          token = await getContentToken();
          result = await fetchFeed(token);
        }
        if (result.res.ok) resBody = result.resBody;
      } catch (e) {
        console.log("[community-feed] content token fetch error:", e instanceof Error ? e.message : e);
      }
    }

    if (!resBody) {
      return NextResponse.json({ posts: [] });
    }

    const raw = JSON.parse(resBody);
    const posts = normalizePosts(raw.data || raw.posts || []);
    const response = JSON.stringify({ posts });

    // Cache the normalized response
    setCachedFeed(response);

    return new NextResponse(response, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[community-feed] error:", e);
    return NextResponse.json({ posts: [] });
  }
}
