# Leaderboard Feature Design — FreshTomatoes Trivia

**Date:** 2026-02-22
**Status:** Design Proposal
**Scope:** Auth-gated leaderboard with real user scores, anonymous-player prompt UX, and supporting API/data layer

---

## 1. Context and Constraints

### Existing architecture

The trivia game lives at `/trivia` and is a pure client-side state machine
(`TriviaGame` -> `GameBoard` -> `ResultsScreen` -> `LeaderboardScreen`). The
game phase is driven by a `useReducer` in `useGame.ts`. The current leaderboard
phase shows mock data from `src/lib/trivia/mockLeaderboard.ts` and is not
persisted anywhere.

Auth is already wired into the app shell via Auth0 (`@auth0/nextjs-auth0`).
The `hasAuthEnabled()` gate checks for five env vars (`AUTH0_SECRET`,
`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `APP_BASE_URL`). The
`Header` already renders a signed-in avatar or a "Sign in" button depending on
auth state. The existing auth provider is Auth0 with Google OAuth2 as the
configured connection.

### Key design constraints

- Auth0/Google is already the chosen provider — do not introduce a second one
- The game's local score session data lives in `localStorage` (key:
  `trivia_sessions`). Persisted leaderboard data must live server-side (Neon
  Postgres, same database used by the Feedback tab)
- Anonymous users can still play, but their scores are never written to the DB
- The leaderboard screen is a phase within the trivia game viewport, which is a
  fixed-height container (`100dvh - 56px/64px`) with internal scroll — all
  leaderboard UI must work within this vertical budget
- The dark cinematic theme must be honored: `background.default: #0a0a0a`,
  `primary.main: #e50914`, `paper: rgba(20,20,20,0.85)`, border-radius 12px,
  MUI component overrides apply globally
- No horizontal overflow at any breakpoint (375px, 768px, 1280px)

---

## 2. Data Model

### Database schema

```sql
-- New table: trivia_runs
CREATE TABLE trivia_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,          -- Auth0 sub (e.g. "google-oauth2|123")
  username    TEXT NOT NULL,          -- Display name at time of submission
  avatar_url  TEXT,                   -- Profile picture URL at time of submission
  score       INTEGER NOT NULL,       -- Correct answers in cumulative session
  total       INTEGER NOT NULL,       -- Total questions answered
  pct         NUMERIC(5,2) NOT NULL,  -- score/total * 100, stored for fast sorting
  played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for leaderboard queries
CREATE INDEX trivia_runs_user_id_idx ON trivia_runs(user_id);
CREATE INDEX trivia_runs_played_at_idx ON trivia_runs(played_at DESC);
CREATE INDEX trivia_runs_pct_idx ON trivia_runs(pct DESC, score DESC);
```

### Leaderboard query strategy

"Today" period: filter `played_at >= NOW() - INTERVAL '24 hours'`

"All time" period: no date filter

For each period, select the **best run per user** (highest `pct`, then highest
`score` as tiebreak). Return top 25.

```sql
-- Best run per user for a given period
SELECT DISTINCT ON (user_id)
  user_id, username, avatar_url, score, total, pct, played_at
FROM trivia_runs
WHERE played_at >= NOW() - INTERVAL '24 hours'  -- omit for all-time
ORDER BY user_id, pct DESC, score DESC;
-- Wrap in CTE and ORDER BY pct DESC, score DESC LIMIT 25
```

### Updated TypeScript types

The existing `LeaderboardRow` in `src/types/trivia.ts` needs two new optional
fields. The `rank` and `isCurrentUser` fields are unchanged.

```typescript
// Addition to LeaderboardRow in src/types/trivia.ts
export interface LeaderboardRow {
  rank: number
  username: string
  score: number
  total: number
  isCurrentUser?: boolean
  // New fields for authenticated entries
  avatarUrl?: string | null    // null = show initials fallback
  userId?: string              // Auth0 sub, used to match current user
}
```

---

## 3. API Routes

### POST /api/trivia/runs

Saves a completed game run. Requires authentication.

**Request:**
```json
{ "score": 14, "total": 20 }
```

**Auth:** Calls `auth0.getSession(req)`. Returns `401` if no session.

**Response (201):**
```json
{
  "id": "uuid",
  "rank": 7,
  "period": "today"
}
```

The response includes the user's new rank so the client can show it
immediately without a second fetch.

**Error cases:**
- `400` — score or total missing / out of range
- `401` — not authenticated
- `503` — DB unavailable (app continues gracefully without persisting)

### GET /api/trivia/leaderboard?period=today|allTime&limit=25

Returns ranked leaderboard rows. Public endpoint — no auth required.

**Response (200):**
```json
{
  "period": "today",
  "rows": [
    {
      "rank": 1,
      "userId": "google-oauth2|abc",
      "username": "CinematicAlex",
      "avatarUrl": "https://lh3.googleusercontent.com/...",
      "score": 20,
      "total": 20
    }
  ],
  "updatedAt": "2026-02-22T14:00:00Z"
}
```

The `userId` field is included so the client can mark `isCurrentUser: true`
by comparing against the Auth0 session user sub.

**Caching:** `Cache-Control: s-maxage=30, stale-while-revalidate=60`
(30-second freshness is sufficient for a leaderboard; reduces DB load)

---

## 4. Updated `gameApi.ts` and `useGame.ts`

### submitRun (updated)

The existing `submitRun` in `gameApi.ts` is a no-op that returns immediately.
It needs to become an async function that conditionally POSTs to the new API
route when the user is authenticated.

```typescript
// gameApi.ts
export async function submitRun(
  score: number,
  total: number,
  isAuthenticated: boolean,
): Promise<{ saved: boolean; rank?: number }> {
  if (!isAuthenticated) return { saved: false }

  try {
    const res = await fetch('/api/trivia/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, total }),
    })
    if (!res.ok) return { saved: false }
    const data = await res.json()
    return { saved: true, rank: data.rank }
  } catch {
    return { saved: false }
  }
}
```

The `useGame` hook receives `isAuthenticated: boolean` as a parameter and
passes it through to `submitRun`.

### getLeaderboard (updated)

```typescript
// gameApi.ts
export async function getLeaderboard(
  period: LeaderboardPeriod,
  currentUserId?: string,
): Promise<LeaderboardRow[]> {
  try {
    const res = await fetch(`/api/trivia/leaderboard?period=${period}`)
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()
    return data.rows.map((row: LeaderboardRow) => ({
      ...row,
      isCurrentUser: currentUserId ? row.userId === currentUserId : false,
    }))
  } catch {
    // Fallback to mock data if API is unavailable
    return mockLeaderboardEntries.map((e, i) => ({ ...e, rank: i + 1 }))
  }
}
```

---

## 5. Leaderboard Screen Redesign

### 5.1 Authenticated user row anatomy

Each row expands to include a circular avatar alongside the existing rank badge,
username, and score. On mobile the avatar is 32px; on desktop 36px.

```
┌─────────────────────────────────────────────────────┐
│  #   [Avatar]  Username              Score / Total  │
│ ─── ─────────  ────────────────────  ──────────────  │
│  1   [G Alex]  CinematicAlex         20 / 20  100%  │
│  2   [R Talk]  ReelTalk99            19 / 20   95%  │
│  3   [B Fan ]  BlockbusterFan        18 / 20   90%  │
│ ┈┈┈ ┈┈┈┈┈┈┈┈┈ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│  7  ▶[  You ]  You (current user)    14 / 20   70%  │
│     ◀ highlighted with red left border + red tint   │
└─────────────────────────────────────────────────────┘
```

**Row layout (480px max-width container):**

```
[rank 36px][avatar 36px + gap 12px][name flex-1][pct 48px][score 64px]
```

The percentage column is new — it makes rank fairer to compare across
different total-question counts as users play multiple rounds.

**Avatar component:**

```
┌──────────────────────────────────────────────────────┐
│  If avatarUrl exists:                                │
│    <Avatar src={avatarUrl} sx={{ w: 36, h: 36 }} /> │
│                                                      │
│  If no avatarUrl (or img fails):                     │
│    <Avatar sx={{ bgcolor: derivedColor, w: 36 }}>   │
│      {initials}  (first letter of username)          │
│    </Avatar>                                         │
│                                                      │
│  Derived color: hash username to one of 6 accent     │
│  colors that work on the dark background:            │
│    #7c3aed, #0891b2, #059669, #d97706, #db2777,     │
│    #e50914 (Netflix red as last resort)              │
└──────────────────────────────────────────────────────┘
```

**Trophy icons for top 3 (replacing or supplementing the colored badges):**

The existing `RankBadge` colored-circle approach works; add a subtle trophy
icon treatment to rank 1 only for visual hierarchy:

- Rank 1: gold circle (#f59e0b) — unchanged, possibly add a tiny `EmojiEventsIcon` at 14px inside
- Rank 2: silver circle — unchanged
- Rank 3: bronze circle (#cd7c3c) — unchanged
- Rank 4+: dimmed numeric text — unchanged

### 5.2 Full leaderboard screen wireframe (480px max-width)

```
┌──────────────────────────────────────────────────────┐
│ ← Back to Results                                    │
│                                                      │
│  Leaderboard                    [Today] [All time]   │
│                                                      │
│  #    Player                    %      Score         │
│  ──── ────────────────────────  ─────  ────────────  │
│  1 🥇 [Av] CinematicAlex        100%   20 / 20       │
│  2    [Av] ReelTalk99            95%   19 / 20       │
│  3    [Av] BlockbusterFan        90%   18 / 20       │
│  4    [Av] NightOwlCinephile     90%   18 / 20       │
│  5    [Av] PopcornPrince         85%   17 / 20       │
│  6    [Av] FilmNerd42            75%   15 / 20       │
│  7    [Av] ScriptDoctor          70%   14 / 20       │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ ▌ YOU — Rank #9                             │    │
│  │   [Av] You · 14 / 20 · 70%                 │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ [Google icon]  Sign in to save your score   │    │
│  │  and appear on this leaderboard              │    │
│  │                    [Sign in with Google →]  │    │
│  └──── shown only when user is NOT signed in ───┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │             Play Again                       │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

**Scroll behavior:** The leaderboard rows section (`leaderboard-rows`) is the
scrollable region. The "Back to Results" button, heading row, column header,
current-user card, sign-in prompt, and "Play Again" button are all sticky or
pinned outside the scroll area. This way the CTA is always visible without
scrolling.

Layout structure (flex column, full height of the phase container):

```
[header area — non-scrolling, ~160px]
  Back button
  Heading + period toggle
  Column labels

[scrollable list — flex-1, overflow-y: auto]
  leaderboard rows (up to 25)

[footer area — non-scrolling, ~180px]
  current-user card (if signed in and ranked)
  sign-in prompt (if not signed in)
  Play Again button
```

---

## 6. Login Prompt UX (Anonymous Users)

### 6.1 Design philosophy

Anonymous users should feel welcome to play, but the leaderboard should
clearly communicate that their scores are ephemeral. The prompt must be
motivating rather than punishing — it shows them **where they would rank**,
then invites them to claim that rank permanently.

### 6.2 Sign-in banner on the leaderboard screen

When the user is not authenticated, a Card-style banner appears in the footer
area of the leaderboard screen (below the rows, above "Play Again"):

```
┌─────────────────────────────────────────────────────────┐
│  [Ghost row — dashed border, 40% opacity]               │
│   ?   [  ?  ]  You (guest)       70%    14 / 20         │
│         Your score would rank around #9 today            │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  G  Sign in with Google to claim your rank      │   │
│  │     and save your score to the leaderboard.     │   │
│  │                                                  │   │
│  │  [ Sign in with Google ]                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Ghost row details:**

- Renders the anonymous user's score as a leaderboard row but with:
  - `opacity: 0.45`
  - `border: 1px dashed rgba(255,255,255,0.2)`
  - Avatar replaced by a lock icon (`LockOutlinedIcon`) in a grey circle
  - `isCurrentUser` highlight removed (no red left border)
  - Username shown as "You (guest)"
- A caption below the ghost row: "Your score would rank around #N today."
  The `#N` is computed client-side by inserting the anonymous score into the
  fetched leaderboard and finding its position — this is pure UI math, no DB
  write.

**Sign-in prompt card:**

```
┌──────────────────────────────────────────────────────┐
│  [G]  Sign in with Google                            │
│       Your score won't be saved unless you sign in.  │
│                                                      │
│       [   Sign in with Google   ]                    │
└──────────────────────────────────────────────────────┘
```

- Background: `rgba(229,9,20,0.06)` (very light red wash)
- Border: `1px solid rgba(229,9,20,0.2)`
- Border-radius: 12px (matches `theme.shape.borderRadius`)
- Google icon: use the official Google `G` SVG, not an MUI icon, rendered as a
  small `<img>` 20x20px next to a Typography heading
- The sign-in button links to `/auth/login` with a `returnTo=/trivia` query
  param so the user is redirected back to the game after auth

### 6.3 Sign-in prompt on the Results screen

The Results screen (`ResultsScreen.tsx`) should also surface a lighter touch
prompt for anonymous users. This avoids the user having to navigate to the
leaderboard just to discover they can't save scores.

Add a small inline notice below the local stats section:

```
┌───────────────────────────────────────────────────┐
│  [ Score card: 14 / 20 — 70% ]                   │
│                                                   │
│  Today's best: 14   Streak: 3d                   │
│                                                   │
│  ──────────────────────────────────────────────   │
│  Scores aren't saved for guests.                  │
│  [Sign in] to appear on the leaderboard.          │
│  ──────────────────────────────────────────────   │
│                                                   │
│  [Keep Playing]                                   │
│  [Share Results & Invite Friends]                 │
│  [New Game]       [Leaderboard]                   │
└───────────────────────────────────────────────────┘
```

This inline prompt should:
- Only show when auth is enabled AND user is not signed in
- Be unobtrusive — one line of `caption` text with an inline link styled in
  `primary.main` color
- Not push the primary CTAs out of view on small screens

### 6.4 Sign-in prompt on the Game Board (minimal)

During active gameplay, no auth prompt is shown. The focus is on the game.
The only auth indicator is the Header's existing "Sign in" button in the top
bar, which is always visible.

---

## 7. Auth Flow

### 7.1 Entry points for sign-in

| Location | Trigger | Destination |
|---|---|---|
| Header top bar | "Sign in" button (already implemented) | `/auth/login` |
| Results screen | Inline text link | `/auth/login?returnTo=/trivia` |
| Leaderboard screen | "Sign in with Google" button in banner | `/auth/login?returnTo=/trivia` |

### 7.2 Post-auth behavior

After successful login, Auth0 redirects to `returnTo` (the trivia page). The
trivia game state is lost because it lives in component state, not a URL param
or localStorage. This is acceptable — the user restarts the game.

To improve continuity: before redirecting to `/auth/login`, save the last
round score to `localStorage` under a key like `trivia_pending_score`. On
return to `/trivia`, if this key exists and the user is now authenticated,
automatically call `POST /api/trivia/runs` to claim the pending score, then
clear the key. Show a brief toast: "Your score of 14/20 has been saved!"

This "claim pending score" flow is optional for v1 — it should be noted in
backlog but is not required for launch.

### 7.3 Auth provider display

Auth0 is configured with `connection: 'google-oauth2'`, meaning only Google
sign-in is offered. All auth UI in the trivia feature should reflect this:

- Button label: "Sign in with Google" (not a generic "Sign in")
- Include the Google `G` logo (20x20px SVG, inline in the button)
- Do not create UI that suggests email/password or other providers exist

If in the future more providers are added, the button label drops back to
"Sign in" and the specific provider logo is removed. This is handled by making
the provider display driven by a constant or env var rather than hard-coded.

---

## 8. Profile Integration

### 8.1 How Auth0 user identity maps to leaderboard entries

Auth0 provides:
- `user.sub` — unique user ID (e.g. `google-oauth2|117...`), used as `user_id` in DB
- `user.name` — Google display name, stored as `username` at time of run
- `user.picture` — Google profile photo URL, stored as `avatar_url` at time of run

These are **snapshot values** at run time. If a user changes their Google name,
old leaderboard rows retain the old name. This is intentional — it matches how
leaderboards typically work and avoids joins on every leaderboard read.

### 8.2 Displaying the current user's row

On the leaderboard screen:
- The API returns all rows including the current user's best run
- The client matches `row.userId === auth0User.sub` to set `isCurrentUser: true`
- The current user's row gets the existing red left-border highlight treatment
- A `(You)` label in `primary.main` color appears below the username
- If the user's best run ranks outside the top 25, a separate "Your rank" card
  is pinned in the footer (fetched from the API with a separate `?userId=...`
  query that returns rank even if outside the top 25)

### 8.3 Profile page trivia stats section

The existing `/profile` page (`ProfileView.tsx`) shows user favorites. A
future enhancement adds a "Trivia" section showing:

- All-time best score (highest pct run)
- Today's best
- Total games played
- Global rank (all-time)

This is out of scope for this design pass but the DB schema supports it
(query `trivia_runs WHERE user_id = $1 ORDER BY pct DESC LIMIT 1`).

---

## 9. Loading and Empty States

### 9.1 Leaderboard loading state

While `getLeaderboard()` is fetching from the API, render skeleton rows.
Use MUI `<Skeleton>` with `animation="wave"` to match the cinematic feel.

```
┌─────────────────────────────────────────────────────┐
│  Leaderboard                    [Today] [All time]  │
│                                                     │
│  #    Player                    %      Score        │
│  ────────────────────────────────────────────────   │
│  ██   [○○○]  ████████████████  ████   ████████     │  (skeleton)
│  ██   [○○○]  ██████████        ████   ████████     │
│  ██   [○○○]  ██████████████    ████   ████████     │
│  ██   [○○○]  ████████          ████   ████████     │
│  ██   [○○○]  ██████████████    ████   ████████     │
│                                                     │
│  [Play Again skeleton]                              │
└─────────────────────────────────────────────────────┘
```

Skeleton row anatomy per row (repeated 7 times):
- Rank: `<Skeleton variant="text" width={24} />`
- Avatar: `<Skeleton variant="circular" width={32} height={32} />`
- Username: `<Skeleton variant="text" width={random between 80–140} />`
- Pct: `<Skeleton variant="text" width={36} />`
- Score: `<Skeleton variant="text" width={52} />`

The period toggle is rendered normally (not skeleton) since it's interactive
and sets which data to fetch. The fetch is triggered on period change.

### 9.2 Period toggle loading micro-state

When the user toggles "Today" <-> "All time", the existing rows fade to
`opacity: 0.4` while the new data loads (300ms transition), then the new rows
animate in with the existing staggered `x: -16 -> 0` Framer Motion pattern.
This avoids the jarring flash of a full skeleton re-render on toggle.

Implementation: add `isFetching: boolean` state alongside `rows`. Apply
`sx={{ opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.3s' }}` to
`leaderboard-rows`.

### 9.3 Empty leaderboard state

When `rows.length === 0` (no runs recorded yet for the selected period):

```
┌─────────────────────────────────────────────────────┐
│  Leaderboard                    [Today] [All time]  │
│                                                     │
│         [EmojiEvents icon, 48px, muted]             │
│         No scores yet for today.                    │
│         Be the first to play!                       │
│                                                     │
│       [Play Again]                                  │
└─────────────────────────────────────────────────────┘
```

- Icon: `EmojiEventsOutlinedIcon` at 48px, color `rgba(255,255,255,0.2)`
- Heading: "No scores yet for today." (variant `body1`, `text.secondary`)
- Subtext: "Be the first to play!" (variant `body2`, `text.disabled`)
- No sign-in prompt in the empty state — the Play Again CTA is the primary action

### 9.4 API error / offline state

If the fetch fails (network error, 5xx, DB down):

```
┌─────────────────────────────────────────────────────┐
│  Leaderboard                    [Today] [All time]  │
│                                                     │
│         [WifiOff icon, 40px, muted]                 │
│         Couldn't load the leaderboard.              │
│         [Try again]                                 │
│                                                     │
│  [Play Again]                                       │
└─────────────────────────────────────────────────────┘
```

The "Try again" link is a small text button (`variant="text"`, `color="primary"`)
that re-triggers the fetch. The "Play Again" button is always shown so the user
is never stuck.

---

## 10. Mobile Responsiveness

### 10.1 Breakpoints

The leaderboard screen already has a `maxWidth: 480` container centered in the
game viewport. This works well at all breakpoints. Specific adjustments:

**375px (xs):**
- Column header: hide the "%" column label. The `%` value in each row is
  still shown but without the header label (saves ~48px horizontal space)
- Row: avatar shrinks to 28px (from 36px). Username still truncates with
  `text-overflow: ellipsis`
- Score column: show "14/20" without the "%" suffix to save space
- Sign-in banner: stack vertically (icon row, then text, then button at full
  width). Button height remains 44px minimum for touch target compliance
- Play Again button: full width (`fullWidth`)

**768px (sm) and up:**
- All columns visible including "%" header and suffix
- Avatar 36px
- Play Again button: max 320px centered (existing behavior)

**1280px (lg):**
- No change from sm — the leaderboard is constrained to 480px max-width and
  stays centered. The outer game viewport handles the whitespace.

### 10.2 Touch target audit

All interactive elements in the leaderboard screen:
- "Back to Results" button: 44px height (MUI default for `size="medium"`)
- Period toggle buttons: `px: 2, py: 0.75` gives ~40px height — set `minHeight: 44`
- "Sign in with Google" button: 52px height (match Play Again)
- "Play Again" button: 52px height (existing)
- "Try again" text button: add `py: 1` to ensure 44px total

### 10.3 No horizontal overflow check

The leaderboard container uses `px: 2` (16px each side) at all sizes. The
row layout uses `flex` with `minWidth: 0` on the name column to allow
truncation. The score/pct columns use `flexShrink: 0` with fixed widths.
Total minimum content width: `36 + 12 + 28 + 12 + (min name 60) + 12 + 48 + 12 + 64 = 284px`,
well within 343px (375 - 32 padding). No overflow.

---

## 11. Animation Patterns

Existing patterns to preserve:
- Row entrance: `x: -16 -> 0, opacity: 0 -> 1` staggered by `index * 0.04s`
- `useReducedMotion()` respected — all animations disabled when true

New patterns to add:

### Current user row entrance

The current user's row (or the ghost row for anonymous users) animates in
with a slight delay after the main rows:

```
delay: rows.length * 0.04 + 0.1  // after the last regular row settles
initial: { opacity: 0, y: 8 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.35, ease: 'easeOut' }
```

### Sign-in banner entrance

The sign-in banner fades and slides in after the leaderboard content:

```
initial: { opacity: 0, y: 12 }
animate: { opacity: 1, y: 0 }
transition: { delay: 0.4, duration: 0.4, ease: 'easeOut' }
```

### Period toggle transition

When `isFetching` turns true, rows fade down in opacity. When new data
arrives and `isFetching` turns false, rows animate in fresh with the
stagger pattern. Implemented by keying the rows container on `period` or
using `AnimatePresence` with a mode of `"sync"`.

---

## 12. Component Architecture

### New and modified components

```
src/
  components/trivia/
    LeaderboardScreen.tsx          — Modified (avatar, pct column, auth states)
    LeaderboardRow.tsx             — New: extract row to own component (already
                                     a local function; promote to named export)
    LeaderboardAnonBanner.tsx      — New: sign-in prompt banner
    LeaderboardGhostRow.tsx        — New: the dashed ghost row for anon users
    LeaderboardSkeleton.tsx        — New: skeleton loading state for rows
    LeaderboardEmpty.tsx           — New: empty / error states
  app/
    api/trivia/
      runs/route.ts                — New: POST handler to save a run
      leaderboard/route.ts         — New: GET handler for ranked rows
```

### Props changes to LeaderboardScreen

```typescript
interface LeaderboardScreenProps {
  userScore: number
  userTotal?: number
  onPlayAgain: () => void
  onBack: () => void
  // New
  isAuthenticated: boolean         // from useUser().user !== null
  currentUserId?: string           // auth0 user.sub, undefined if anon
  authEnabled: boolean             // from LayoutShell / hasAuthEnabled()
}
```

`TriviaGame.tsx` reads `useUser()` from `@auth0/nextjs-auth0/client` and
passes `isAuthenticated` and `currentUserId` down to `LeaderboardScreen`.
`authEnabled` is passed as a prop from the page down through `TriviaGame`
(the page can read it from `hasAuthEnabled()` server-side and pass as a
serialized prop, or the component can check `typeof window !== 'undefined'`
and call a client-safe utility).

The cleanest approach: add an `authEnabled` data attribute to the trivia
page wrapper `<div>` and read it in `TriviaGame`, OR export `authEnabled`
as a context value set in `LayoutShell`.

---

## 13. Accessibility

### Screen reader announcements

When leaderboard data loads, announce to screen readers:

```html
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {loaded && `Leaderboard updated. Showing top ${rows.length} players.`}
</div>
```

When the current user's rank is known:

```html
<div aria-live="polite" className="sr-only">
  {isAuthenticated && rank && `Your rank is #${rank}.`}
  {!isAuthenticated && `Sign in to save your score and appear on the leaderboard.`}
</div>
```

### Keyboard navigation

- The sign-in button must be focusable and reachable via Tab from the Play
  Again button
- The period toggle (`ToggleButtonGroup`) already supports arrow key navigation
  via MUI's built-in behavior
- The "Try again" retry button must have a clear focus ring (use MUI's default
  focus-visible outline, already styled globally in theme)

### Color contrast

- Ghost row at `opacity: 0.45` will have insufficient contrast for text. The
  ghost row exists purely as a decorative suggestion — mark it
  `aria-hidden="true"` and provide the same information in a nearby text node
  accessible to screen readers: "Your score would place you at approximately
  rank 9."

---

## 14. Phased Implementation Plan

### Phase 1 — UI only, mock data (unblocks front-end work immediately)

1. Update `LeaderboardRow` type to add `avatarUrl` and `userId`
2. Update mock leaderboard entries in `mockLeaderboard.ts` to include fake
   avatar URLs (can be `null` — initials fallback will render)
3. Redesign `LeaderboardScreen.tsx`:
   - Add avatar column
   - Add pct column
   - Extract `LeaderboardGhostRow` and `LeaderboardAnonBanner` components
   - Accept `isAuthenticated` and `authEnabled` props
   - Wire `LeaderboardSkeleton` and `LeaderboardEmpty` for loading/empty states
4. Update `ResultsScreen.tsx` to show the inline sign-in nudge
5. Update `TriviaGame.tsx` to pass auth props down

**Deliverable:** Full leaderboard UI working with mock data, auth prompts
visible, no back-end yet.

### Phase 2 — Database and API routes

1. Run the `trivia_runs` migration against Neon Postgres
2. Implement `POST /api/trivia/runs` route (auth-gated)
3. Implement `GET /api/trivia/leaderboard` route
4. Update `gameApi.ts` `submitRun` to call the API when authenticated
5. Update `LeaderboardScreen` to fetch from the API instead of calling the
   local `getLeaderboard` function

**Deliverable:** Real scores persisted and displayed.

### Phase 3 — Polish and claim-pending-score flow

1. Implement the `trivia_pending_score` localStorage -> API claim flow
2. Add toast notification on successful score save
3. Add profile page trivia stats section
4. Performance: add DB index on `played_at` for efficient "today" queries

---

## 15. Open Questions and Trade-offs

**Q: Should anonymous users' local `localStorage` scores ever merge with their
account after they sign in?**

A: Yes, this is desirable UX but adds complexity. The "claim pending score"
flow in Phase 3 handles the most recent round. Historical rounds (multiple
`trivia_sessions` entries) could be batch-submitted on first sign-in. Requires
storing a `claimed: boolean` flag in the localStorage session objects. Defer
to Phase 3.

**Q: Should the leaderboard be globally visible or only shown after playing?**

A: Current design keeps it gated behind the game flow (only reachable as a
phase after results). A standalone `/leaderboard` page is a reasonable future
addition but adds a new route and nav entry. Defer.

**Q: Username display — Google name vs. custom handle?**

A: Use the Google `user.name` value for now. A custom username input on the
profile page would be a better long-term UX (users want handles, not their
full name on a public board) but is a separate feature. For v1, fall back to
Google name and display it as-is.

**Q: What happens when `user.picture` URL expires?**

A: Google profile photo URLs can expire or return 403 over time. Always
render the initials `Avatar` as a fallback (MUI `Avatar` shows the `children`
when the `src` image fails to load). No special handling needed.

**Q: Rate limiting — can users spam `POST /api/trivia/runs`?**

A: The game only triggers `submitRun` at the end of a round (once per 5
questions). To prevent abuse, the API route can check the `played_at`
timestamp of the user's most recent run and reject submissions more frequent
than once per 30 seconds. Log violations but don't block hard to avoid false
positives. Add this check in Phase 2.

**Q: Should the leaderboard cache be invalidated when a new score is POSTed?**

A: The API response uses `s-maxage=30`. After a successful POST, the client
can immediately refetch the leaderboard (ignore the 30s cache by appending a
cache-bust query param `?t=<timestamp>`) so the user sees their new rank
right away. The CDN cache is unaffected and continues serving stale data to
other users for up to 30 seconds — this is acceptable for a leaderboard.

---

## 16. ASCII Mockup Reference

### Leaderboard — authenticated user, ranked

```
┌──────────────────────────────────────────────────────┐
│                      max-width: 480px                │
│                                                      │
│  ← Back to Results                                   │
│                                                      │
│  Leaderboard              [ Today │ All time ]       │
│                                                      │
│   #    Player               %      Score             │
│  ──── ──────────────────── ──────  ──────────        │
│                                                      │
│   🥇  [G] CinematicAlex    100%   20 / 20            │
│   2   [R] ReelTalk99        95%   19 / 20            │
│   3   [B] BlockbusterFan    90%   18 / 20            │
│   4   [N] NightOwlCinephile 90%   18 / 20            │
│   5   [P] PopcornPrince     85%   17 / 20            │
│   6   [F] FilmNerd42        75%   15 / 20            │
│   7   [S] ScriptDoctor      70%   14 / 20            │
│   8   [I] IndieSleeper      65%   13 / 20            │
│                                                      │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │ ▌ 9  [Y] You              70%   14 / 20     You │ │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│     ^ red left border, subtle red background tint    │
│                                                      │
│  ╔══════════════════════════════════════════════╗    │
│  ║         Play Again                           ║    │
│  ╚══════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────┘
```

### Leaderboard — anonymous user

```
┌──────────────────────────────────────────────────────┐
│  ← Back to Results                                   │
│                                                      │
│  Leaderboard              [ Today │ All time ]       │
│                                                      │
│   #    Player               %      Score             │
│  ──── ──────────────────── ──────  ──────────        │
│   🥇  [G] CinematicAlex    100%   20 / 20            │
│   2   [R] ReelTalk99        95%   19 / 20            │
│   3   [B] BlockbusterFan    90%   18 / 20            │
│   ...                                                │
│                                                      │
│  ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄  │
│  ┊ ?  [🔒] You (guest)    70%   14 / 20  ← ghost ┊  │
│  ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄ ┄  │
│     Your score would rank around #9 today.           │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  [G]  Sign in with Google                   │    │
│  │       Save your score and claim your rank.  │    │
│  │                                              │    │
│  │  [ Sign in with Google ▶ ]                  │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ╔══════════════════════════════════════════════╗    │
│  ║         Play Again                           ║    │
│  ╚══════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────┘
```

### Leaderboard — loading state

```
┌──────────────────────────────────────────────────────┐
│  ← Back to Results                                   │
│                                                      │
│  Leaderboard              [ Today │ All time ]       │
│                                                      │
│   #    Player               %      Score             │
│  ──── ──────────────────── ──────  ──────────        │
│                                                      │
│   ██  [○○] ████████████████  ████  ████████          │
│   ██  [○○] ████████          ████  ████████          │
│   ██  [○○] ████████████      ████  ████████          │
│   ██  [○○] ██████████████    ████  ████████          │
│   ██  [○○] ██████            ████  ████████          │
│   ██  [○○] ████████████████  ████  ████████          │
│   ██  [○○] ████████████      ████  ████████          │
│                                                      │
│  ╔══════════════════════════════════════════════╗    │
│  ║         Play Again                           ║    │
│  ╚══════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────┘
```

### Leaderboard — empty state

```
┌──────────────────────────────────────────────────────┐
│  ← Back to Results                                   │
│                                                      │
│  Leaderboard              [ Today │ All time ]       │
│                                                      │
│                                                      │
│                     🏆                              │
│              No scores yet today.                    │
│              Be the first to play!                   │
│                                                      │
│                                                      │
│  ╔══════════════════════════════════════════════╗    │
│  ║         Play Again                           ║    │
│  ╚══════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────┘
```

### Results screen — anonymous sign-in nudge

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ROUND 1 COMPLETE                                    │
│                                                      │
│  ┌────────────────────────────────┐                  │
│  │       You scored               │                  │
│  │          14                    │                  │
│  │         ─────                  │                  │
│  │          / 20                  │                  │
│  │          70%                   │                  │
│  │      Getting There!            │                  │
│  └────────────────────────────────┘                  │
│                                                      │
│   Today's best: 14     Streak: 3d                    │
│                                                      │
│  ── Scores aren't saved for guests. Sign in ──       │
│                                                      │
│  ╔══════════════════════════════════════════════╗    │
│  ║            Keep Playing                      ║    │
│  ╚══════════════════════════════════════════════╝    │
│  ┌──────────────────────────────────────────────┐    │
│  │      Share Results & Invite Friends          │    │
│  └──────────────────────────────────────────────┘    │
│  [ New Game ]              [ Leaderboard ]           │
└──────────────────────────────────────────────────────┘
```

### Mobile (375px) — leaderboard, anonymous

```
┌────────────────────────────┐
│ ← Back to Results          │
│                            │
│ Leaderboard                │
│         [Today][All time]  │
│                            │
│  #   Player      Score     │
│ ─── ─────────── ─────────  │
│  🥇 [G] Alex     20/20     │
│  2  [R] ReelTlk  19/20     │
│  3  [B] Blockbu  18/20     │
│  4  [N] NightOw  18/20     │
│  5  [P] Popcorn  17/20     │
│                            │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│ ┊?  [🔒] You (guest) 14/20┊│
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│  ~Rank #9 today            │
│                            │
│ ┌──────────────────────┐   │
│ │ [G] Sign in with     │   │
│ │     Google to save   │   │
│ │     your score.      │   │
│ │                      │   │
│ │ [Sign in with Google]│   │
│ └──────────────────────┘   │
│                            │
│ ╔══════════════════════╗   │
│ ║    Play Again        ║   │
│ ╚══════════════════════╝   │
└────────────────────────────┘
```

---

*Document complete. Phase 1 implementation can begin immediately against this
specification. Back-end work (Phase 2) can proceed in parallel once the DB
migration is approved.*
