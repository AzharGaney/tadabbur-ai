import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    return fallbackSearch(query);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are a Quran verse discovery assistant. When the user describes a life situation,
emotion, or question, use the Quran MCP tools to find the most relevant verses.
Always call search_quran first, then fetch_quran and fetch_translation for the top results.
Return ONLY a JSON array of objects with keys: verse_key, arabic_text, translation_text.
No preamble, no markdown, no explanation. Return 3-5 results.`,
        messages: [{ role: "user", content: query }],
        mcp_servers: [
          { type: "url", url: "https://mcp.quran.ai", name: "quran" },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic MCP error status:", response.status, errText);
      return fallbackSearch(query);
    }

    const data = await response.json();

    // --- DEBUG: log the full response so we can see the structure ---
    console.log("=== ANTHROPIC MCP FULL RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=== CONTENT BLOCKS ===");
    if (data.content) {
      data.content.forEach((block: Record<string, unknown>, i: number) => {
        console.log(`  Block ${i}: type="${block.type}"`, JSON.stringify(block).slice(0, 500));
      });
    }
    console.log("=== END DEBUG ===");

    // Strategy 1: Look for text blocks containing JSON
    const textBlocks = (data.content || []).filter(
      (item: { type: string }) => item.type === "text"
    );
    for (const block of textBlocks) {
      const raw = (block as { text: string }).text || "";
      const cleaned = raw.replace(/```json\s?|```/g, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json({ verses: parsed });
        }
      } catch {
        // Not valid JSON, try extracting array from within the text
        const match = cleaned.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return NextResponse.json({ verses: parsed });
            }
          } catch { /* continue */ }
        }
      }
    }

    // Strategy 2: Look for mcp_tool_result blocks and extract verse data
    const mcpBlocks = (data.content || []).filter(
      (item: { type: string }) =>
        item.type === "mcp_tool_result" || item.type === "tool_result"
    );
    const collectedVerses: { verse_key: string; arabic_text: string; translation_text: string }[] = [];

    for (const block of mcpBlocks) {
      // MCP tool results can have nested content arrays
      const innerContent = (block as { content?: unknown[] }).content || [];
      for (const inner of innerContent) {
        const text = (inner as { text?: string }).text || "";
        if (!text) continue;
        try {
          const parsed = JSON.parse(text);
          // Could be a single result or array
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item.verse_key || item.verseKey || item.key) {
                collectedVerses.push({
                  verse_key: item.verse_key || item.verseKey || item.key || "",
                  arabic_text: item.arabic_text || item.arabicText || item.text || "",
                  translation_text: item.translation_text || item.translationText || item.translation || "",
                });
              }
            }
          } else if (parsed && typeof parsed === "object") {
            // Single verse or search results wrapper
            if (parsed.results) {
              for (const item of parsed.results) {
                collectedVerses.push({
                  verse_key: item.verse_key || item.verseKey || item.key || "",
                  arabic_text: item.arabic_text || item.arabicText || item.text || "",
                  translation_text: item.translation_text || item.translationText || item.translation || "",
                });
              }
            } else if (parsed.verse_key || parsed.verseKey) {
              collectedVerses.push({
                verse_key: parsed.verse_key || parsed.verseKey || "",
                arabic_text: parsed.arabic_text || parsed.arabicText || parsed.text || "",
                translation_text: parsed.translation_text || parsed.translationText || parsed.translation || "",
              });
            }
          }
        } catch {
          // not JSON, skip
        }
      }
    }

    if (collectedVerses.length > 0) {
      return NextResponse.json({ verses: collectedVerses });
    }

    // Strategy 3: Try to find verse keys anywhere in the full response text
    const fullText = JSON.stringify(data.content);
    const verseKeyPattern = /\b(\d{1,3}:\d{1,3})\b/g;
    const foundKeys = [...new Set(fullText.match(verseKeyPattern) || [])].slice(0, 5);
    if (foundKeys.length > 0) {
      console.log("Extracted verse keys from response:", foundKeys);
      // Fetch these verses from Content API
      const { getContentToken } = await import("@/lib/content-token");
      const token = await getContentToken();
      const apiUrl = process.env.QF_CONTENT_API_URL!;
      const authHeaders = { "x-auth-token": token, "x-client-id": process.env.QF_CLIENT_ID! };
      const verses = await Promise.all(
        foundKeys.map(async (key) => {
          try {
            const [verseRes, transRes] = await Promise.all([
              fetch(`${apiUrl}/verses/by_key/${key}?words=true&fields=text_uthmani`, { headers: authHeaders }),
              fetch(`${apiUrl}/quran/translations/85?verse_key=${key}`, { headers: authHeaders }),
            ]);
            if (!verseRes.ok) return null;
            const vd = await verseRes.json();
            let translationText = "";
            if (transRes.ok) {
              const td = await transRes.json();
              translationText = td.translations?.[0]?.text?.replace(/<[^>]*>/g, "") || "";
            }
            const transliteration = (vd.verse.words || [])
              .filter((w: { char_type_name: string }) => w.char_type_name === "word")
              .map((w: { transliteration?: { text: string } }) => w.transliteration?.text || "")
              .filter(Boolean)
              .join(" ");
            return {
              verse_key: vd.verse.verse_key,
              arabic_text: vd.verse.text_uthmani || "",
              translation_text: translationText,
              transliteration,
            };
          } catch {
            return null;
          }
        })
      );
      const valid = verses.filter(Boolean);
      if (valid.length > 0) {
        return NextResponse.json({ verses: valid });
      }
    }

    console.log("All extraction strategies failed, falling back to text search");
    return fallbackSearch(query);
  } catch (error) {
    console.error("Semantic search error:", error);
    return fallbackSearch(query);
  }
}

// Curated verses for common themes — used when both MCP and Content API search are unavailable
const THEME_VERSES: Record<string, string[]> = {
  patience: ["2:153", "2:155", "3:200", "11:115", "16:127", "39:10", "103:1"],
  hardship: ["2:286", "65:7", "94:5", "94:6", "2:214", "29:2"],
  anxiety: ["13:28", "2:286", "3:139", "9:51", "65:3", "10:62"],
  fear: ["2:277", "10:62", "3:175", "33:39", "46:13"],
  grateful: ["14:7", "2:152", "31:12", "16:18", "55:13", "27:40"],
  gratitude: ["14:7", "2:152", "31:12", "16:18", "55:13"],
  forgiveness: ["39:53", "4:110", "3:135", "42:25", "2:222", "11:3"],
  loss: ["2:156", "2:155", "3:185", "29:57", "21:35"],
  sadness: ["12:86", "93:3", "93:4", "93:5", "94:5", "94:6"],
  anger: ["3:134", "42:37", "7:199", "41:34"],
  guidance: ["1:6", "2:2", "2:185", "6:161", "17:9", "3:8"],
  trust: ["3:159", "65:3", "8:2", "9:51", "12:67"],
  love: ["2:165", "3:31", "85:14", "19:96", "11:90"],
  death: ["3:185", "21:35", "29:57", "62:8", "4:78"],
  wealth: ["2:261", "64:16", "3:92", "57:18", "2:274"],
  family: ["25:74", "46:15", "31:14", "64:14", "66:6"],
  difficult: ["2:286", "94:5", "94:6", "65:7", "2:214", "3:200"],
  people: ["49:13", "109:1", "25:63", "3:134", "7:199", "41:34"],
  future: ["31:34", "2:216", "65:3", "9:51", "3:139"],
  success: ["23:1", "87:14", "91:9", "3:200", "24:51"],
  prayer: ["2:186", "40:60", "50:16", "29:45", "20:14"],
};

async function fallbackSearch(query: string) {
  const { getContentToken } = await import("@/lib/content-token");

  // First try the Content API search
  try {
    const token = await getContentToken();
    const apiUrl = process.env.QF_CONTENT_API_URL!;
    const res = await fetch(
      `${apiUrl}/search?q=${encodeURIComponent(query)}&size=5&language=en`,
      {
        headers: {
          "x-auth-token": token,
          "x-client-id": process.env.QF_CLIENT_ID!,
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const results = data.search?.results || [];
      if (results.length > 0) {
        const verses = results.map(
          (r: { verse_key: string; text: string; translations?: { text: string }[] }) => ({
            verse_key: r.verse_key,
            arabic_text: r.text || "",
            translation_text: r.translations?.[0]?.text || "",
          })
        );
        return NextResponse.json({ verses });
      }
    }
  } catch {
    console.error("Content API search failed, using theme-based fallback");
  }

  // Theme-based fallback: match query words to curated verse lists
  const queryLower = query.toLowerCase();
  const matchedKeys: string[] = [];
  for (const [theme, keys] of Object.entries(THEME_VERSES)) {
    if (queryLower.includes(theme)) {
      matchedKeys.push(...keys);
    }
  }
  // Deduplicate and limit
  const uniqueKeys = [...new Set(matchedKeys)].slice(0, 5);

  // If no theme matched, use a general set
  if (uniqueKeys.length === 0) {
    uniqueKeys.push("2:286", "94:5", "94:6", "13:28", "65:3");
  }

  // Fetch actual verse data with separate translation call
  try {
    const token = await getContentToken();
    const apiUrl = process.env.QF_CONTENT_API_URL!;
    const clientId = process.env.QF_CLIENT_ID!;
    const authHeaders = { "x-auth-token": token, "x-client-id": clientId };

    const verses = await Promise.all(
      uniqueKeys.map(async (key) => {
        try {
          const [verseRes, transRes] = await Promise.all([
            fetch(`${apiUrl}/verses/by_key/${key}?words=true&fields=text_uthmani`, { headers: authHeaders }),
            fetch(`${apiUrl}/quran/translations/85?verse_key=${key}`, { headers: authHeaders }),
          ]);
          if (!verseRes.ok) return null;
          const vd = await verseRes.json();
          let translationText = "";
          if (transRes.ok) {
            const td = await transRes.json();
            translationText = td.translations?.[0]?.text?.replace(/<[^>]*>/g, "") || "";
          }
          const transliteration = (vd.verse.words || [])
            .filter((w: { char_type_name: string }) => w.char_type_name === "word")
            .map((w: { transliteration?: { text: string } }) => w.transliteration?.text || "")
            .filter(Boolean)
            .join(" ");
          return {
            verse_key: vd.verse.verse_key,
            arabic_text: vd.verse.text_uthmani || "",
            translation_text: translationText,
            transliteration,
          };
        } catch {
          return null;
        }
      })
    );
    return NextResponse.json({ verses: verses.filter(Boolean) });
  } catch {
    return NextResponse.json({ verses: [] });
  }
}
