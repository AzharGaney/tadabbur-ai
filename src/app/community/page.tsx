"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";

interface Comment {
  id: string;
  body: string;
  author?: { name?: string };
  created_at: string;
}

interface Post {
  id: string;
  body: string;
  verse_key?: string;
  author?: { name?: string };
  likes_count?: number;
  comments_count?: number;
  created_at: string;
}

export default function CommunityPage() {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [feedError, setFeedError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const fetchedRef = useRef(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setFeedError(null);
    try {
      const headers: Record<string, string> = {};
      if (isAuthenticated) {
        const token = await getAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const r = await fetch("/api/content/community-feed", { headers });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to load community feed");
      setPosts(data.posts || data.data || []);
    } catch (e) {
      setFeedError(e instanceof Error ? e.message : "Failed to load community feed");
    }
    setLoading(false);
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadFeed();
  }, [loadFeed]);

  const handleLike = useCallback(
    async (postId: string) => {
      if (!isAuthenticated) return;
      const token = await getAccessToken();
      if (!token) return;

      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (next.has(postId)) next.delete(postId);
        else next.add(postId);
        return next;
      });

      // Optimistic UI update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes_count: (p.likes_count || 0) + (likedPosts.has(postId) ? -1 : 1),
              }
            : p
        )
      );

      await fetch("/api/user/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postId }),
      });
    },
    [isAuthenticated, getAccessToken, likedPosts]
  );

  const loadComments = useCallback(
    async (postId: string) => {
      if (expandedComments[postId]) {
        // Toggle off
        setExpandedComments((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
        return;
      }

      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const headers: Record<string, string> = {};
        if (isAuthenticated) {
          const token = await getAccessToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/content/comments?postId=${postId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setExpandedComments((prev) => ({
            ...prev,
            [postId]: data.comments || data.data || [],
          }));
        }
      } catch (e) {
        console.error(e);
      }
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    },
    [expandedComments, isAuthenticated, getAccessToken]
  );

  const submitComment = useCallback(
    async (postId: string) => {
      const body = commentText[postId]?.trim();
      if (!body || !isAuthenticated) return;

      const token = await getAccessToken();
      if (!token) return;

      setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
      setCommentError((prev) => ({ ...prev, [postId]: "" }));

      try {
        const res = await fetch("/api/user/comments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ postId, body }),
        });

        if (res.ok) {
          setCommentText((prev) => ({ ...prev, [postId]: "" }));
          // Force re-fetch comments by clearing then loading
          setExpandedComments((prev) => {
            const next = { ...prev };
            delete next[postId];
            return next;
          });
          // Small delay then reload
          setTimeout(() => loadComments(postId), 100);
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId
                ? { ...p, comments_count: (p.comments_count || 0) + 1 }
                : p
            )
          );
        } else {
          const data = await res.json().catch(() => ({}));
          const msg = data.message || data.error || "Failed to post comment";
          if (res.status === 403) {
            setCommentError((prev) => ({ ...prev, [postId]: "Unable to post comment. Please try again later." }));
          } else {
            setCommentError((prev) => ({ ...prev, [postId]: msg }));
          }
        }
      } catch {
        setCommentError((prev) => ({ ...prev, [postId]: "Failed to post comment. Please try again." }));
      }
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    },
    [commentText, isAuthenticated, getAccessToken, loadComments]
  );

  return (
    <div className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl sm:text-2xl font-semibold">Community Reflections</h1>
          <p className="text-[var(--text-secondary)]">
            Read and be inspired by reflections from others.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 rounded bg-[var(--border-color)]" />
                  <div className="h-5 w-12 rounded-full bg-[var(--border-color)]" />
                </div>
                <div className="h-4 w-full rounded bg-[var(--border-color)]" />
                <div className="h-4 w-5/6 rounded bg-[var(--border-color)]" />
                <div className="flex gap-4 pt-1">
                  <div className="h-4 w-10 rounded bg-[var(--border-color)]" />
                  <div className="h-4 w-20 rounded bg-[var(--border-color)]" />
                </div>
              </div>
            ))}
          </div>
        ) : feedError ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-8 text-center space-y-3">
            <p className="text-[var(--text-secondary)]">{feedError}</p>
            <button
              onClick={loadFeed}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white font-medium hover:bg-emerald-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-[var(--text-secondary)]">
              No public reflections yet. Be the first to share!
            </p>
            <Link
              href="/discover"
              className="inline-block rounded-xl bg-emerald-700 px-6 py-3 text-white font-medium hover:bg-emerald-600 transition-colors"
            >
              Reflect on a verse
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 space-y-3 fade-in"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {post.author?.name || "Anonymous"}
                  </span>
                  {post.verse_key && (
                    <Link
                      href={`/reflect/${post.verse_key}`}
                      className="inline-flex items-center rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      {post.verse_key}
                    </Link>
                  )}
                </div>

                {/* Body */}
                <p className="font-serif leading-relaxed">{post.body}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={() => handleLike(post.id)}
                    disabled={!isAuthenticated}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      likedPosts.has(post.id)
                        ? "text-emerald-600 font-medium"
                        : "text-[var(--text-tertiary)] hover:text-emerald-600"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span>{likedPosts.has(post.id) ? "\u2665" : "\u2661"}</span>
                    {post.likes_count || 0}
                  </button>

                  <button
                    onClick={() => loadComments(post.id)}
                    className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-emerald-600 transition-colors"
                  >
                    <span>{"\u270D"}</span>
                    {post.comments_count || 0} comments
                  </button>

                  <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                    {formatDate(post.created_at)}
                  </span>
                </div>

                {/* Comments Section */}
                {loadingComments[post.id] && (
                  <div className="flex justify-center py-3">
                    <div className="h-5 w-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                  </div>
                )}

                {expandedComments[post.id] && (
                  <div className="border-t border-[var(--border-color)] pt-3 mt-2 space-y-3">
                    {expandedComments[post.id].length === 0 ? (
                      <p className="text-sm text-[var(--text-tertiary)]">No comments yet.</p>
                    ) : (
                      expandedComments[post.id].map((c) => (
                        <div key={c.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {c.author?.name || "Anonymous"}
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {formatDate(c.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">{c.body}</p>
                        </div>
                      ))
                    )}

                    {/* Comment Form */}
                    {isAuthenticated && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText[post.id] || ""}
                            onChange={(e) =>
                              setCommentText((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                submitComment(post.id);
                              }
                            }}
                            placeholder="Write a comment..."
                            disabled={submittingComment[post.id]}
                            className="flex-1 rounded-lg border border-[var(--border-color)] bg-background px-3 py-2 text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={!commentText[post.id]?.trim() || submittingComment[post.id]}
                            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                          >
                            {submittingComment[post.id] ? "..." : "Post"}
                          </button>
                        </div>
                        {commentError[post.id] && (
                          <p className="text-xs text-red-500">{commentError[post.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return "just now";
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
