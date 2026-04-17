# Tadabbur AI — Guided Quran Reflection

Tadabbur AI is a guided Quran reflection web platform that helps Muslims maintain a deep, personal connection with the Quran by turning reflection into a daily practice. Instead of just reading, users contemplate and internalize meaning through a structured, emotionally rewarding experience.

Built for the **Quran Foundation Hackathon** (April 2026).

## The Problem

The post-Ramadan engagement drop-off happens not because people lack access to the Quran, but because they lack a structured, emotionally rewarding reason to return each day.

## The Solution

Tadabbur AI provides that reason: a beautiful, guided reflection experience that produces a personal artifact (your written reflection), creates social reinforcement (others can read and engage with your reflections), and tracks your consistency over time.

## Screenshots

<!-- Replace with actual screenshots -->
| Landing | Discover | Reflection Flow |
|---------|----------|-----------------|
| ![Landing](screenshots/landing.png) | ![Discover](screenshots/discover.png) | ![Reflect](screenshots/reflect.png) |

| Journal | Dashboard | Community |
|---------|-----------|-----------|
| ![Journal](screenshots/journal.png) | ![Dashboard](screenshots/dashboard.png) | ![Community](screenshots/community.png) |

## Features

### Discover
- **"What's on your mind?"** — describe your situation and find relevant verses via semantic search (Quran MCP + Claude AI)
- **Verse of the Day** — daily curated verse with Arabic text and translation
- **Surah browser** — browse all 114 surahs with Arabic names, verse counts, and pagination
- **Loading skeletons** — smooth loading states while content fetches

### Guided Reflection Flow (7 steps)
1. **Recitation** — Full Arabic text with audio playback (Mishary Rashid Alafasy)
2. **Word by Word** — Arabic word, transliteration, and individual meaning
3. **Translation** — Clean English translation (M.A.S. Abdel Haleem)
4. **Tafsir** — Scholarly commentary (Ibn Kathir)
5. **AI Reflection Prompts** — 3 personalized prompts from Claude (self-examination, gratitude/action, conversation with Allah)
6. **Write Your Reflection** — Save publicly (QuranReflect), privately (Notes), or both. Draft autosaved to localStorage
7. **Completion** — Streak update, activity logged, bookmark auto-created

### Journal
- Tabbed view: Reflections / Bookmarks / Collections
- Search and filter by surah
- Chronological feed with verse links

### Dashboard
- Current and longest streak counters
- GitHub-style activity heatmap (52-week grid)
- Weekly reading time from Reading Sessions API
- Goal progress tracking

### Community
- Public reflections feed from QuranReflect
- Like and comment on reflections
- Relative timestamps

### Polish
- **Dark mode** — manual toggle (light/dark/system) + OS preference with flash prevention
- **Mobile responsive** — full responsiveness with hamburger menu on all pages
- **Smooth animations** — staggered step transitions with cubic-bezier easing, bismillah reveal
- **Error states** — friendly messages with retry buttons on all pages
- **Loading skeletons** — skeleton UI across discover, dashboard, journal, and community
- **Custom favicon** — emerald crescent + book icon

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with custom design system
- **Fonts:** Inter (UI), Lora (serif/translations), Amiri (Arabic)
- **Auth:** Quran Foundation OAuth2 with PKCE
- **AI:** Anthropic Claude API (reflection prompts) + Quran MCP (semantic search)
- **Deployment:** Vercel

## API Integration (8 Content + 8 User + 2 External)

| Feature | API |
|---|---|
| Browse surahs | Content API — Chapters |
| Display verse | Content API — Verses |
| Verse of the Day | Content API — Verses (curated daily) |
| Play recitation | Content API — Audio |
| Show translation | Content API — Translations |
| Show tafsir | Content API — Tafsirs |
| Semantic search | Quran MCP via Anthropic API |
| Reflection prompts | Anthropic Claude API |
| Save public reflection | User API — Posts |
| Save private reflection | User API — Notes |
| Bookmark verse | User API — Bookmarks |
| Organize reflections | User API — Collections |
| Track streaks | User API — Streaks |
| Log activity | User API — Activity Days |
| Set goals | User API — Goals |
| Log reading sessions | User API — Reading Sessions |
| Community feed | Quran Reflect API — Posts |
| Like/comment | User API — Posts + Comments |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/your-username/tadabbur-ai.git
cd tadabbur-ai
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# Quran Foundation OAuth2
QF_CLIENT_ID=your_client_id
QF_CLIENT_SECRET=your_client_secret
QF_REDIRECT_URI=http://localhost:3000/callback
QF_OAUTH_ENDPOINT=https://prelive-oauth2.quran.foundation

# Quran Foundation APIs
QF_CONTENT_API_URL=https://apis-prelive.quran.foundation/content/api/v4
QF_USER_API_URL=https://apis-prelive.quran.foundation/auth/v1
QF_REFLECT_API_URL=https://apis.quran.foundation/quran-reflect/v1

# Anthropic (for AI reflection prompts and semantic search)
ANTHROPIC_API_KEY=your_anthropic_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

## Architecture

```
src/
  app/
    page.tsx                    — Landing page (bismillah + hero)
    (auth)/login, callback      — OAuth2 PKCE flow
    discover/                   — Semantic search + verse of the day + surah browser
    reflect/[verseKey]/         — 7-step guided reflection
    journal/                    — Notes, bookmarks, collections
    dashboard/                  — Streaks, heatmap, goals
    community/                  — Public reflections feed
    api/
      auth/token, refresh       — Server-side OAuth2 token exchange
      content/chapters, verse,
        verse-of-the-day,
        tafsir, audio           — Content API proxies
      search/semantic           — Quran MCP semantic search
      reflect/prompts           — Claude AI reflection prompts
      user/bookmarks, streaks,
        posts, notes, activity,
        goals, reading-sessions — User API proxies
  components/
    providers/auth, theme       — Context providers
    ui/navbar, verse-card       — Shared UI
    dashboard/activity-heatmap  — Heatmap widget
  lib/
    auth.ts                     — PKCE utilities + token storage
    quran-api.ts                — API client types + helpers
    content-token.ts            — Server-side client_credentials token
```

All API calls are proxied through Next.js API routes to keep secrets server-side. Content API tokens use `client_credentials` with Basic auth. User API tokens use Authorization Code + PKCE.

## License

MIT
