// Shared in-memory cache for the community feed.
// Extracted so that other routes (e.g. /api/user/posts) can invalidate it
// after a user publishes a new reflection.

interface FeedCacheEntry {
  data: string;
  expiresAt: number;
}

let feedCache: FeedCacheEntry | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (reduced from 5)

export function getCachedFeed(): FeedCacheEntry | null {
  if (feedCache && Date.now() < feedCache.expiresAt) {
    return feedCache;
  }
  return null;
}

export function setCachedFeed(data: string) {
  feedCache = { data, expiresAt: Date.now() + CACHE_TTL };
}

export function invalidateFeedCache() {
  console.log("[feed-cache] Cache invalidated");
  feedCache = null;
}
