# Tadabbur AI — Master Build Prompt

> **What this document is:** A single, comprehensive prompt you can paste into Claude Code to build the entire Tadabbur AI project. It contains every technical detail, API reference, architecture decision, and design specification needed. Nothing is left ambiguous.

---

## CONTEXT & OBJECTIVE

You are building **Tadabbur AI** — a guided Quran reflection (tadabbur) web platform for the **Quran Foundation Hackathon** (deadline: April 20, 2026, prize pool: $10,000). The app helps Muslims maintain a deep, personal connection with the Quran after Ramadan by turning reflection into a daily practice — not just reading, but truly contemplating and internalizing the meaning.

**The core insight:** The post-Ramadan engagement drop-off happens not because people lack access to the Quran, but because they lack a structured, emotionally rewarding reason to return each day. Tadabbur AI provides that reason: a beautiful, guided reflection experience that produces a personal artifact (your written reflection), creates social reinforcement (others can read and engage with your reflections), and tracks your consistency over time.

---

## HACKATHON REQUIREMENTS (MANDATORY)

The project MUST use:
- **At least one Content API** (or Quran MCP): Quran APIs, Audio APIs, Tafsir APIs, Translation APIs, or Post APIs (Lessons & Reflections)
- **At least one User API**: Bookmarks, Collections, Streak Tracking, Post APIs (Post a reflection), or Activity & Goals APIs

**Judging criteria (100 points total):**
1. **Impact on Quran Engagement — 30pts** (highest weight, tiebreaker)
2. **Product Quality & UX — 20pts**
3. **Technical Execution — 20pts**
4. **Innovation & Creativity — 15pts**
5. **Effective Use of APIs — 15pts**

**Submission requirements:**
- Live demo or working app link
- GitHub repository
- 2–3 minute demo video
- API usage description

---

## TECH STACK

- **Frontend:** Next.js 14+ (App Router) with TypeScript
- **Styling:** Tailwind CSS + custom design system (see Design section below)
- **Auth:** Quran Foundation OAuth2 with PKCE (Authorization Code flow)
- **APIs:** Quran Foundation Content APIs v4, User APIs v1, Quran MCP (semantic search)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514) for generating reflection prompts
- **Deployment:** Vercel (for live demo link)
- **Font:** Use Quran Foundation's recommended Arabic font rendering (see https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering)

---

## API CREDENTIALS

### Pre-Production (for development and testing — all features enabled)
```
Client ID: 10d965c6-c552-4628-93d7-732987eae77f
Client Secret: QZLVFWQS.e9GcSqhK8pIGqcXVr
OAuth Endpoint: https://prelive-oauth2.quran.foundation
Content API Base: https://apis-prelive.quran.foundation/content/api/v4
User API Base: https://apis-prelive.quran.foundation/auth/v1
```

### Production (full content, user features pending approval)
```
Client ID: f23a4bc5-7df6-408e-abde-ae312e06350a
Client Secret: w1Ify536.msLd9e-6GFxm_VIeU
OAuth Endpoint: https://oauth2.quran.foundation
Content API Base: https://apis.quran.foundation/content/api/v4
User API Base: https://apis.quran.foundation/auth/v1
```

**USE PRE-PRODUCTION CREDENTIALS FOR NOW.** Store in `.env.local` (add to `.gitignore`).

---

## QURAN FOUNDATION API REFERENCE

### Base URLs (FROM OFFICIAL OPENAPI SPEC)

```
# Content APIs v4 (Pre-production — USE THIS FOR DEV)
https://apis-prelive.quran.foundation/content/api/v4

# Content APIs v4 (Production)
https://apis.quran.foundation/content/api/v4

# User APIs v1 (Pre-production — USE THIS FOR DEV)
https://apis-prelive.quran.foundation/auth/v1

# User APIs v1 (Production)
https://apis.quran.foundation/auth/v1

# OAuth2 (Pre-production — USE THIS FOR DEV)
https://prelive-oauth2.quran.foundation

# OAuth2 (Production)
https://oauth2.quran.foundation

# Quran Reflect Posts (read endpoints)
https://apis.quran.foundation/quran-reflect/v1

# Quran MCP (Semantic Search)
https://mcp.quran.ai
```

**IMPORTANT:** The old `api.quran.com/api/v4` URL is deprecated. Always use `apis.quran.foundation/content/api/v4` (or `apis-prelive.quran.foundation/content/api/v4` for dev).

### Authentication

All API calls require two headers:
```
x-auth-token: <access_token>
x-client-id: <your_client_id>
```

**For Content APIs:** Use `client_credentials` grant type with `content` scope. Token expires after 1 hour — re-issue using `client_credentials` again.

**For User APIs:** Use Authorization Code flow with PKCE. The user must consent to scopes. Keep `client_secret` on your backend only.

**For Quran Reflect read-only endpoints:** Use `client_credentials` with `post.read` scope for feed/posts and `comment.read` for comments.

### OAuth2 PKCE Flow (for User APIs)

```
1. Generate code_verifier (random 43-128 char string)
2. Generate code_challenge = base64url(SHA256(code_verifier))
3. Generate cryptographic state + nonce
4. Redirect user to:
   GET {OAUTH_ENDPOINT}/authorize
     ?response_type=code
     &client_id={CLIENT_ID}
     &redirect_uri={REDIRECT_URI}
     &scope={SCOPES}
     &code_challenge={CODE_CHALLENGE}
     &code_challenge_method=S256
     &state={STATE}
     &nonce={NONCE}
5. User logs in on Quran Foundation hosted login page
6. Quran Foundation redirects to your redirect_uri with ?code=...&state=...
7. Verify state matches
8. On YOUR BACKEND (Next.js API route), exchange the code:
   POST {OAUTH_ENDPOINT}/oauth2/token
   Content-Type: application/x-www-form-urlencoded
   Body: grant_type=authorization_code
         &code={CODE}
         &code_verifier={CODE_VERIFIER}
         &redirect_uri={REDIRECT_URI}
         &client_id={CLIENT_ID}
         &client_secret={CLIENT_SECRET}
9. Response: { access_token, refresh_token, id_token }
10. Use access_token in x-auth-token header for User API calls
```

Refer to: https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2

### Content APIs

All endpoints relative to the Content API base URL.

**Chapters:**
```
GET /chapters                              — list all 114 surahs
GET /chapters/{chapter_id}                 — single surah info
GET /chapters/{chapter_id}/info            — detailed surah info
Query: language (e.g., "en")
```

**Verses:**
```
GET /verses/by_chapter/{chapter_number}    — all verses in a surah
GET /verses/by_key/{verse_key}             — single verse (e.g., "2:255")
GET /verses/random                         — random verse
Query: language, translations (comma-separated IDs), fields, word_fields, word_translation_language, per_page, page
```

**Translations:**
```
GET /resources/translations                — list available translations
GET /verses/by_key/{verse_key}?translations=20,131
  - 20 = Sahih International
  - 131 = Dr. Mustafa Khattab (The Clear Quran)
```

**Tafsir:**
```
GET /tafsirs/{tafsir_id}/by_ayah/{verse_key}  — tafsir for a specific verse
GET /resources/tafsirs                         — list available tafsirs
Query: language
```

**Audio:**
```
GET /chapter_recitations/{reciter_id}/{chapter_number}  — audio file for a surah
GET /resources/recitations                               — list available reciters
Query: segments (boolean — when true, includes word-level timestamps)
```

**Quran Text Scripts:**
```
GET /quran/verses/uthmani              — Uthmani script
GET /quran/verses/imlaei               — Simple text
Query: chapter_number, verse_key
```

**Search:**
```
GET /search?q={query}&size={size}&page={page}&language={language}
```

**Quran Reflect Posts (read-only, uses post.read scope with client_credentials):**
```
GET /quran-reflect/v1/posts/feed                  — public reflections feed
GET /quran-reflect/v1/posts/{id}                  — single post
GET /quran-reflect/v1/posts/user-posts/{id}       — user's posts
GET /quran-reflect/v1/posts/{id}/comments         — comments (comment.read scope)
GET /quran-reflect/v1/posts/{id}/all-comments
```
Note: These are at `https://apis.quran.foundation` level, NOT under `/content/api/v4`.

### User APIs

All endpoints relative to the User API base URL.

**Bookmarks:**
```
GET    /bookmarks                    — list bookmarks
POST   /bookmarks                    — create (body: { key: "2:255", type: "ayah" })
DELETE /bookmarks/{id}               — delete
Scopes: bookmark, bookmark.read, bookmark.create, bookmark.delete
```

**Collections:**
```
GET    /collections                  — list collections
POST   /collections                  — create (body: { name: "My Tadabbur", description: "..." })
PUT    /collections/{id}             — update
DELETE /collections/{id}             — delete
Scopes: collection, collection.read, collection.create, collection.update, collection.delete
```

**Streaks:**
```
GET    /streaks                      — current streak info
PUT    /streaks                      — update/increment streak
Scopes: streak, streak.read, streak.update
```

**Activity Days:**
```
GET    /activity-days                — list activity days
POST   /activity-days                — log an activity day
PUT    /activity-days/{id}           — update
Scopes: activity_day, activity_day.read, activity_day.create, activity_day.update
```

**Goals:**
```
GET    /goals/today                  — today's goal plan
POST   /goals                        — create goal
PUT    /goals/{id}                   — update goal
Scopes: goal, goal.read, goal.create, goal.update
```

**Reading Sessions:**
```
GET    /reading-sessions             — list sessions
POST   /reading-sessions             — create session
PUT    /reading-sessions/{id}        — update
Scopes: reading_session, reading_session.read, reading_session.create, reading_session.update
```

**Notes (private reflections):**
```
GET    /notes                        — list notes
POST   /notes                        — create (body: { body: "...", verse_key: "2:255" })
Scopes: note (and sub-scopes)
```

**Posts (QuranReflect — for PUBLISHING reflections):**
```
POST   /posts                        — publish reflection (body: { body: "...", ... })
PUT    /posts/{id}                   — update
DELETE /posts/{id}                   — delete
Scopes: post, post.read, post.create, post.update, post.delete, post.like, post.save
```

**Comments:**
```
POST   /posts/{id}/comments          — comment on a reflection
Scopes: comment, comment.read, comment.create, comment.like
```

**User Profile:**
```
GET    /users/profile                — read profile
Scopes: user.profile.read
```

Pagination: cursor-based with `first`, `after`, `before`, `last`. Only `first + after` or `last + before` combos.

---

## QURAN MCP — SEMANTIC SEARCH

The Quran MCP at `https://mcp.quran.ai` provides grounded, verified Quranic content retrieval. It exposes these tools:

- **`fetch_grounding_rules`** — Retrieves grounding instructions
- **`list_editions`** — Lists available editions (translations, tafsirs, scripts)
- **`search_quran`** — Semantic search across Quran text, translations, and tafsir
- **`fetch_quran`** — Fetches Quranic Arabic text by verse reference and script
- **`fetch_translation`** — Fetches translation by verse reference and edition
- **`fetch_tafsir`** — Fetches tafsir commentary by verse reference and edition

### Integration via Anthropic API with MCP Servers

```javascript
// In your Next.js API route: /app/api/search/semantic/route.ts
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a Quran verse discovery assistant. When the user describes a life situation, 
emotion, or question, use the Quran MCP tools to find the most relevant verses. 
Always call search_quran first, then fetch_quran and fetch_translation for the top results.
Return ONLY a JSON array of objects with keys: verse_key, arabic_text, translation_text.
No preamble, no markdown, no explanation.`,
    messages: [{ role: "user", content: userQuery }],
    mcp_servers: [
      { type: "url", url: "https://mcp.quran.ai", name: "quran" }
    ]
  })
});

// Process response — MCP responses have multiple content block types
const data = await response.json();
const toolResults = data.content
  .filter(item => item.type === "mcp_tool_result")
  .map(item => item.content?.[0]?.text || "")
  .join("\n");
const textResponses = data.content
  .filter(item => item.type === "text")
  .map(item => item.text)
  .join("\n");
```

---

## REFLECTION PROMPT GENERATION (CLAUDE API)

For Step 5 of the Reflection Flow:

```javascript
// In your Next.js API route: /app/api/reflect/prompts/route.ts
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You are a thoughtful Islamic reflection guide. Your role is to help Muslims engage in 
tadabbur (deep contemplation) of Quranic verses. Generate 3 reflection prompts that:

1. Are deeply personal and introspective — make the reader pause and think about their own life
2. Connect the verse's meaning to real, everyday situations
3. Vary in type: one for self-examination, one for gratitude or action, one for du'a or conversation with Allah
4. Are warm, gentle, and non-judgmental in tone
5. Are concise (1-2 sentences each)
6. NEVER give scholarly tafsir, fatwa, or fiqh rulings — you prompt reflection, not teaching
7. Respect the verse's context and scholarly understanding provided in the tafsir
8. If the user arrived via a personal query, subtly connect prompts to their situation

Respond ONLY with a JSON array of 3 strings. No preamble, no markdown.
Example: ["prompt 1", "prompt 2", "prompt 3"]`,
    messages: [{
      role: "user",
      content: `Verse (Arabic): ${arabicText}
Translation: ${translationText}
Tafsir summary: ${tafsirSummary}
User's context: ${userQuery || "General reflection"}`
    }]
  })
});

const data = await response.json();
const text = data.content[0].text.replace(/```json|```/g, "").trim();
const prompts = JSON.parse(text);
```

---

## REQUESTED OAUTH2 SCOPES

Request ALL of these when redirecting to the authorization endpoint:

```
openid offline_access content search
bookmark bookmark.read bookmark.create bookmark.delete
collection collection.read collection.create collection.update collection.delete
streak streak.read streak.update
activity_day activity_day.read activity_day.create activity_day.update
goal goal.read goal.create goal.update
reading_session reading_session.read reading_session.create reading_session.update
note
post post.read post.create post.update post.delete post.like post.save
comment comment.read comment.create comment.like
user.profile.read
```

---

## APPLICATION ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                     FRONTEND                         │
│               Next.js 14+ App Router                 │
│                                                      │
│  ┌───────────┐ ┌───────────┐ ┌────────────────┐    │
│  │  Landing   │ │ Discover  │ │   Reflect      │    │
│  │   Page     │ │ (Search + │ │   (Guided      │    │
│  │            │ │  Browse)  │ │    Flow)        │    │
│  └───────────┘ └───────────┘ └────────────────┘    │
│  ┌───────────┐ ┌───────────┐ ┌────────────────┐    │
│  │  Journal   │ │ Dashboard │ │  Community     │    │
│  │ (My Refs)  │ │ (Streaks) │ │  (Feed)        │    │
│  └───────────┘ └───────────┘ └────────────────┘    │
└──────────────────┬──────────────────────────────────┘
                   │
          Next.js API Routes (server-side)
                   │
    ┌──────────────┼───────────────────┐
    │              │                   │
    ▼              ▼                   ▼
┌────────┐   ┌──────────┐     ┌────────────┐
│ Quran  │   │  Quran   │     │ Anthropic  │
│ Found. │   │  MCP     │     │ Claude API │
│ APIs   │   │(Semantic │     │(Reflection │
│        │   │ Search)  │     │ Prompts)   │
└────────┘   └──────────┘     └────────────┘
```

### Directory Structure
```
tadabbur-ai/
├── src/app/
│   ├── layout.tsx                    # Root layout, providers, fonts
│   ├── page.tsx                      # Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx            # Initiates OAuth2 PKCE flow
│   │   └── callback/page.tsx         # Handles OAuth2 callback
│   ├── discover/
│   │   └── page.tsx                  # "What's on your mind?" + surah browser
│   ├── reflect/
│   │   └── [verseKey]/
│   │       └── page.tsx              # Guided reflection flow
│   ├── journal/
│   │   └── page.tsx                  # Personal reflection journal
│   ├── dashboard/
│   │   └── page.tsx                  # Streaks, goals, activity heatmap
│   ├── community/
│   │   └── page.tsx                  # Public reflection feed
│   └── api/
│       ├── auth/
│       │   ├── token/route.ts        # Backend token exchange
│       │   └── refresh/route.ts      # Token refresh
│       ├── content/
│       │   ├── verse/route.ts        # Proxy to Content API
│       │   ├── tafsir/route.ts       # Proxy to Tafsir API
│       │   └── audio/route.ts        # Proxy to Audio API
│       ├── search/
│       │   └── semantic/route.ts     # Quran MCP semantic search
│       ├── reflect/
│       │   └── prompts/route.ts      # Claude API reflection prompts
│       └── user/
│           ├── bookmarks/route.ts
│           ├── collections/route.ts
│           ├── streaks/route.ts
│           ├── posts/route.ts
│           └── activity/route.ts
├── src/components/
│   ├── ui/                           # Reusable UI primitives
│   ├── reflection/                   # Reflection flow components
│   ├── verse/                        # Verse display components
│   └── dashboard/                    # Dashboard widgets
├── src/lib/
│   ├── quran-api.ts                  # Quran Foundation API client
│   ├── auth.ts                       # OAuth2 PKCE utilities
│   ├── claude.ts                     # Anthropic API client
│   └── hooks/                        # Custom React hooks
├── public/
│   └── fonts/                        # Arabic Quran fonts
├── .env.local                        # Environment variables (NEVER commit)
└── tailwind.config.ts
```

### Environment Variables (.env.local)
```env
# Quran Foundation OAuth2 (Pre-production)
QF_CLIENT_ID=10d965c6-c552-4628-93d7-732987eae77f
QF_CLIENT_SECRET=QZLVFWQS.e9GcSqhK8pIGqcXVr
QF_REDIRECT_URI=http://localhost:3000/callback
QF_OAUTH_ENDPOINT=https://prelive-oauth2.quran.foundation

# Quran Foundation APIs (Pre-production)
QF_CONTENT_API_URL=https://apis-prelive.quran.foundation/content/api/v4
QF_USER_API_URL=https://apis-prelive.quran.foundation/auth/v1
QF_REFLECT_API_URL=https://apis.quran.foundation/quran-reflect/v1

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## CORE USER FLOWS

### Flow 1: "What's On Your Mind?" (Discover to Reflect)

1. User lands on the Discover page
2. Prominent text input: "What's on your mind today?" with examples like "I'm feeling anxious about the future", "I want to be more grateful", "How should I deal with difficult people?"
3. User types their situation/question
4. **Backend:** Send query to Anthropic API with Quran MCP → `search_quran` finds relevant verses → `fetch_quran` + `fetch_translation` gets full text
5. Display 3-5 relevant verses as beautiful cards (Arabic + translation preview)
6. User taps a verse → enters the **Reflection Flow**

### Flow 2: Surah Browser (Discover to Reflect)

1. Alternative entry: user browses surahs in a clean grid/list
2. Taps a surah → sees its verses
3. Taps a verse → enters the **Reflection Flow**

### Flow 3: The Reflection Flow (THE CORE EXPERIENCE)

Multi-step, immersive, linear flow — one screen at a time, no distractions.

**Step 1 — The Verse (Recitation)**
- Full-screen Arabic text in beautiful Quranic calligraphy
- Audio recitation plays automatically (Audio API)
- Replay, pause controls
- Subtle "Continue" button at bottom
- **API:** `GET {CONTENT_API}/chapter_recitations/{reciter_id}/{chapter_number}` with `segments=true`

**Step 2 — Word by Word**
- Same verse, word-by-word with: Arabic word, transliteration, individual word meaning
- Builds understanding before full translation
- **API:** Verse data with `word_fields=text_uthmani,translation` and `word_translation_language=en`

**Step 3 — Translation**
- Clean English translation display
- Switch between multiple translations
- **API:** `GET {CONTENT_API}/verses/by_key/{verse_key}?translations=20,131`

**Step 4 — Tafsir (Scholarly Commentary)**
- Tafsir from Ibn Kathir, al-Sa'di, etc.
- Expandable sections
- **API:** `GET {CONTENT_API}/tafsirs/{tafsir_id}/by_ayah/{verse_key}`

**Step 5 — Reflection Prompts (AI-Generated)**
- 3 personalized prompts from Claude (see Claude API section)
- Based on verse, tafsir, and user's original query
- Labelled "Reflection prompts to help you contemplate" — NOT "AI interpretation"

**Step 6 — Write Your Reflection**
- Large focused text area
- Prompts visible above as guidance
- Options: **Publish** (QuranReflect), **Save privately** (Notes), or **Both**
- **On submit:**
  - `POST {USER_API}/posts` — if publishing
  - `POST {USER_API}/notes` — if saving privately
  - `POST {USER_API}/bookmarks` — auto-bookmark verse
  - `PUT {USER_API}/streaks` — update streak
  - `POST {USER_API}/activity-days` — log activity
  - `POST {USER_API}/reading-sessions` — log session

**Step 7 — Completion**
- "Your reflection has been saved" confirmation
- Current streak count with visual indicator
- "You've reflected on X verses this week"
- CTA: "Reflect on another verse" or "View your journal"

### Flow 4: Journal (My Reflections)

- Chronological feed of past reflections
- Each entry: verse (Arabic + translation), reflection text, date, public/private
- Uses Collections API — reflected verses auto-added to "My Tadabbur" collection
- Browse Notes and Bookmarks
- Filter by surah, date, search
- **API:** `GET {USER_API}/collections`, `GET {USER_API}/notes`, `GET {USER_API}/bookmarks`

### Flow 5: Dashboard (Streaks and Progress)

- **Streak counter:** current + longest (Streaks API)
- **Activity heatmap:** GitHub-style contribution graph (Activity Days API)
- **Goal tracker:** "Reflect on 5 verses this week" progress bar (Goals API)
- **Stats:** Total reflections, verses reflected upon, most reflected surah
- **Reading sessions:** Time spent this week (Reading Sessions API)
- **API:** `GET {USER_API}/streaks`, `GET {USER_API}/activity-days`, `GET {USER_API}/goals/today`, `GET {USER_API}/reading-sessions`

### Flow 6: Community Feed

- Public reflections from all users
- Like and comment
- **API:** `GET /quran-reflect/v1/posts/feed`, `POST {USER_API}/posts/{id}/comments`

---

## DESIGN SYSTEM

### Philosophy
**Sacred, calm, and focused** — like a quiet mosque at Fajr time. Reflective space, not social media. Inspiration: Headspace calm + Day One warmth + spiritual weight of a mushaf.

### Color Palette
```css
:root {
  /* Primary — Deep Teal */
  --color-primary-50: #f0fdfa;
  --color-primary-100: #ccfbf1;
  --color-primary-200: #99f6e4;
  --color-primary-300: #5eead4;
  --color-primary-400: #2dd4bf;
  --color-primary-500: #14b8a6;
  --color-primary-600: #0d9488;
  --color-primary-700: #0f766e;
  --color-primary-800: #115e59;
  --color-primary-900: #134e4a;

  /* Gold Accent */
  --color-accent-400: #fbbf24;
  --color-accent-500: #f59e0b;
  --color-accent-600: #d97706;

  /* Neutral (warm grays) */
  --color-surface: #fefdfb;
  --color-surface-elevated: #ffffff;
  --color-text-primary: #1c1917;
  --color-text-secondary: #57534e;
  --color-text-tertiary: #a8a29e;
  --color-border: #e7e5e4;

  /* Dark mode */
  --color-dark-surface: #1c1917;
  --color-dark-surface-elevated: #292524;
  --color-dark-text-primary: #fafaf9;
  --color-dark-text-secondary: #a8a29e;
}
```

### Typography
- **Arabic:** `KFGQPC Uthmanic Script HAFS` or QF recommended font. Min 24px reading, 36px+ reflection flow. Line-height 2.0+.
- **English UI:** `Inter`
- **English translations/reflections:** `Lora` or `Crimson Text` (serif)
- Arabic large + centered, English smaller

### Layout
- Max content width: 680px
- Generous whitespace, especially Arabic
- One thing per screen in reflection flow
- Subtle transitions (fade/slide, 300ms ease)
- RTL for Arabic (`dir="rtl"`, `lang="ar"`)

### Components
- **Verse Card:** 12px rounded, subtle shadow, Arabic on top, translation below, verse key badge
- **Reflection Steps:** Full-viewport, centered, step dots at top, Continue pinned to bottom
- **Streak Badge:** Circular, flame/crescent icon, pulse animation
- **Activity Heatmap:** 52-week grid, primary color opacity scale

### Accessibility
- `lang="ar"` on all Arabic text
- Dark mode via `prefers-color-scheme`
- Keyboard navigation
- Color contrast 4.5:1 minimum

---

## IMPLEMENTATION PRIORITIES

### Phase 1: Core Loop (Days 1-5)
1. Project setup with Tailwind, fonts, layout, .env.local
2. OAuth2 PKCE auth flow (login, callback, token exchange, refresh)
3. Discover page with surah browser (Content API)
4. Reflection Flow Steps 1-4 (verse, word-by-word, translation, tafsir)
5. Reflection Flow Step 5 (Claude API reflection prompts)
6. Reflection Flow Step 6 (write and save — Posts + Notes API)
7. Auto-bookmark + streak update on submit

### Phase 2: Differentiation (Days 6-10)
8. "What's on your mind?" semantic search (Quran MCP)
9. Journal page (Collections + Notes + Bookmarks)
10. Dashboard with streak counter + activity heatmap
11. Goals integration
12. Audio recitation in Step 1

### Phase 3: Polish (Days 11-14)
13. Community feed (reflections, like, comment)
14. Dark mode
15. Animations and transitions
16. Loading states, error handling, empty states
17. Mobile responsiveness
18. Performance (font loading, API caching)

### Phase 4: Ship (Days 15-18)
19. Deploy to Vercel
20. Record 2-3 min demo video
21. Write project description + API usage docs
22. Final testing and bug fixes
23. Submit

---

## DEMO VIDEO STRATEGY (2.5 minutes)

**0:00-0:15** — "Millions connect with the Quran during Ramadan. After Ramadan, that connection fades. Tadabbur AI makes reflection a daily habit."

**0:15-1:15** — Core flow: type query → semantic search → verses → reflection flow → write reflection → streak update.

**1:15-1:45** — Journal filling up. Streak counter, heatmap, goal progress.

**1:45-2:15** — Published reflection gets like/comment. Browse community.

**2:15-2:30** — "Tadabbur AI: from reading to reflecting. Built with the Quran Foundation API ecosystem."

**Pro tip:** Use the app for several days before recording so data looks real.

---

## API INTEGRATION SUMMARY

| Feature | Content API | User API | Other |
|---|---|---|---|
| Browse surahs | Chapters | — | — |
| Display verse | Verses | — | — |
| Play recitation | Audio | — | — |
| Show translation | Translations | — | — |
| Show tafsir | Tafsirs | — | — |
| Semantic search | — | — | Quran MCP |
| Reflection prompts | — | — | Claude API |
| Save public | — | Posts | — |
| Save private | — | Notes | — |
| Bookmark verse | — | Bookmarks | — |
| Organize | — | Collections | — |
| Track streaks | — | Streaks | — |
| Log activity | — | Activity Days | — |
| Set goals | — | Goals | — |
| Log reading | — | Reading Sessions | — |
| Community feed | Quran Reflect | — | — |
| Like/comment | — | Posts + Comments | — |

**8 Content + 8 User + 2 External = deep integration across the entire ecosystem.**

---

## KEY TECHNICAL NOTES

1. **Token refresh:** Auto-refresh using `refresh_token`. Check expiry proactively.
2. **Caching:** Cache Content API aggressively (chapters dont change). Use Next.js `revalidate`.
3. **Arabic fonts:** `font-display: swap`, system Arabic fallback.
4. **Error handling:** User-friendly messages. Auth failures redirect to login.
5. **Offline:** Cache verse data in browser. Draft reflections in localStorage, sync when online.
6. **Content sensitivity:** NEVER modify Arabic text. Always proper RTL. Translations/tafsirs as-is.
7. **AI boundaries:** Claude ONLY generates reflection prompts. NOT tafsir or scholarly content. Label as "Reflection prompts to help you contemplate."

---

## BUILD THIS NOW

1. Create `.env.local` with pre-production credentials
2. Implement OAuth2 PKCE flow first (unblocks everything)
3. Build the reflection flow — this IS the product
4. Everything else supports it

**Impact is 30 points and the tiebreaker. Every decision should answer: "Does this help someone connect more deeply with the Quran?"**

بسم الله — lets build.
