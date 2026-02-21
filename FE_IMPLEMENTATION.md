# Daily Swipe Trivia — Frontend Implementation

## File Map

### Types

| File | Description |
|------|-------------|
| `src/types/trivia.ts` | All TypeScript interfaces for the trivia feature: `TriviaQuestion`, `LeaderboardRow`, `GameState`, `GamePhase`, `TriviaSession`, `LeaderboardPeriod`, `ScoreTier` |

### Data Layer

| File | Description |
|------|-------------|
| `src/lib/trivia/mockQuestions.ts` | 45 hard-coded trivia questions about movies/TV from the 1990s onward. Approximately 50/50 true/false split. |
| `src/lib/trivia/mockLeaderboard.ts` | 9 mock leaderboard entries (top 5 + ranks 7-10). Rank 6 is reserved for the current user. |
| `src/lib/trivia/gameApi.ts` | Abstracted data layer with `getQuestions()`, `submitRun()`, `getLeaderboard()`, plus score tier helpers. All functions return mock data in v1. |

### Custom Hooks

| File | Description |
|------|-------------|
| `src/hooks/useGame.ts` | Game state machine using `useReducer`. Manages phase transitions (playing/results/leaderboard), scoring, question shuffling, and localStorage persistence for streaks and daily bests. |
| `src/hooks/useSwipe.ts` | Swipe gesture engine built on Framer Motion's `useMotionValue` and `useTransform`. Provides derived values for card rotation, YES/NO label opacity, and color overlays. Handles commit/snap-back decisions based on drag distance (80px) and velocity (500px/s) thresholds. |

### Components

| File | Description |
|------|-------------|
| `src/components/trivia/SwipeCard.tsx` | Individual trivia card with drag behavior, YES/NO overlay labels, color tint overlays, poster placeholder, title/year/type display, and statement text. |
| `src/components/trivia/CardStack.tsx` | Manages rendering of the active card (z-index 1, full scale) and next card underneath (z-index 0, scale 0.95, offset down 10px, opacity 0.7). |
| `src/components/trivia/GameBoard.tsx` | Main game screen: score display with animated +1 floating indicator, progress bar, card stack, YES/NO buttons, keyboard controls, correct/incorrect flash overlay, and screen reader announcements. |
| `src/components/trivia/ResultsScreen.tsx` | End-of-game results: animated score count-up (0 to final over 600ms), percentage with color-coded display, tier message, local stats (today's best + streak from localStorage), Play Again and View Leaderboard buttons. |
| `src/components/trivia/LeaderboardScreen.tsx` | Ranked leaderboard with gold/silver/bronze badges for top 3, current user highlight row, Today/All Time toggle (both show same mock data in v1), staggered row entrance animations, Back to Results and Play Again buttons. |
| `src/components/trivia/TriviaGame.tsx` | Top-level state machine component. Uses `AnimatePresence` with `mode="wait"` to transition between playing, results, and leaderboard phases with appropriate enter/exit animations. |

### Route

| File | Description |
|------|-------------|
| `src/app/trivia/page.tsx` | Server component that renders `TriviaGame`. No data fetching needed in v1. |
| `src/app/trivia/loading.tsx` | Skeleton loading screen matching the game layout (score row + card + buttons). |

### Navigation

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Added `QuizIcon` import and `{ label: 'Trivia', path: '/trivia', icon: QuizIcon }` to the `menuItems` array. |

---

## Component Hierarchy

```
TriviaPage (server, src/app/trivia/page.tsx)
  └── TriviaGame (client, state machine)
        ├── GameBoard (phase: 'playing')
        │     ├── Score + Progress Row
        │     │     ├── Score with animated +1 indicator
        │     │     ├── Question counter ("Question N of 20")
        │     │     └── LinearProgress bar
        │     ├── CardStack
        │     │     ├── SwipeCard (active, z-index 1, draggable)
        │     │     │     ├── Poster placeholder
        │     │     │     ├── Title + year + media type
        │     │     │     ├── Statement text
        │     │     │     ├── YES label (motion.div, opacity from x)
        │     │     │     ├── NO label (motion.div, opacity from x)
        │     │     │     └── Color overlays (green right / red left)
        │     │     └── SwipeCard (next, z-index 0, scale 0.95)
        │     ├── YES/NO Buttons
        │     ├── Keyboard hint (pointer:fine only)
        │     └── Flash overlay (correct/incorrect)
        ├── ResultsScreen (phase: 'results')
        │     ├── Score card (animated count-up)
        │     ├── Local stats row (from localStorage)
        │     ├── Play Again button
        │     └── View Leaderboard button
        └── LeaderboardScreen (phase: 'leaderboard')
              ├── Back to Results link
              ├── Period toggle (Today / All time)
              ├── Column headers
              ├── Leaderboard rows (staggered entrance)
              └── Play Again button
```

---

## State Management

### Game State (`useGame` hook)

Uses `useReducer` with a `GameState` shape:

```typescript
{
  phase: 'playing' | 'results' | 'leaderboard'
  questions: TriviaQuestion[]     // 20 shuffled questions for this run
  currentIndex: number            // 0-19
  score: number                   // correct answers count
  answers: boolean[]              // history of correct/incorrect
  totalQuestions: number           // always 20
}
```

**State transitions:**
- `START` — Shuffles questions, resets to phase: 'playing'
- `ANSWER` — Increments index, optionally increments score, auto-transitions to 'results' after question 20
- `SHOW_RESULTS` — Sets phase to 'results'
- `SHOW_LEADERBOARD` — Sets phase to 'leaderboard'
- `BACK_TO_RESULTS` — Sets phase back to 'results'

### Swipe State (`useSwipe` hook)

Entirely driven by Framer Motion values (not React state), keeping the 60fps drag interaction off the React render cycle:

- `x` (MotionValue) — horizontal card position
- `rotate` (derived) — card rotation from x
- `yesOpacity` / `noOpacity` (derived) — label visibility from x
- `overlayBgRight` / `overlayBgLeft` (derived) — tint color from x

React state is only used for `isLocked` (prevents double-swipes during commit animation).

### Local Persistence

`localStorage` key `trivia_sessions` stores an array of `{ date, score }` objects (max 30). Used to calculate:
- **Today's best score** — highest score from sessions with today's date
- **Current streak** — consecutive days with at least one session

---

## How to Swap Mock Data for Real APIs

The data layer is abstracted behind three functions in `src/lib/trivia/gameApi.ts`:

### `getQuestions(): TriviaQuestion[]`

**Current:** Shuffles the 45-question static array and returns 20.

**To swap:** Make this function `async`, fetch from a `/api/trivia` route handler that returns questions from a database or external API. Update `useGame` to handle the async initialization (add a loading state).

### `submitRun(score, total): { score, total }`

**Current:** No-op that returns the input.

**To swap:** POST to `/api/trivia/submit` with the score, user ID (from auth), and timestamp. The API can store results in the database for real leaderboard data.

### `getLeaderboard(period, userScore): LeaderboardRow[]`

**Current:** Returns mock entries with the user inserted at rank 6.

**To swap:** Fetch from `/api/trivia/leaderboard?period=today|allTime` which queries the database for actual ranked results. The user's row would be identified by their auth session.

### Migration checklist

1. Create API route handlers in `src/app/api/trivia/`
2. Add database table for trivia results (user_id, score, total, played_at)
3. Make `getQuestions` async and add loading state to `useGame`
4. Wire `submitRun` to POST endpoint
5. Wire `getLeaderboard` to GET endpoint
6. Remove mock data files once real data is confirmed working

---

## Key Architectural Decisions

1. **Motion values over React state for drag.** Card position, rotation, and overlay opacity are all Framer Motion `MotionValue` instances connected via `useTransform`. This keeps the drag interaction at 60fps without triggering React re-renders on every pointer move.

2. **useReducer for game state.** The game has clear phase transitions with predictable state shapes. A reducer provides a single source of truth and makes the state machine explicit and testable.

3. **No intro screen in v1.** The game auto-starts on page load per the UX spec (Section 13.1). The intro screen is deferred to v2 when daily limits are introduced.

4. **Static questions bundled in the app.** No API route or server fetch is needed for v1. Questions are imported directly from `src/lib/trivia/mockQuestions.ts`, making the trivia page fully static (no server-side rendering required).

5. **localStorage for session persistence.** Today's best score and streak are tracked client-side only. This is appropriate for v1 since there is no user authentication requirement for the trivia feature.

6. **Reduced motion support.** All animations respect `prefers-reduced-motion` via Framer Motion's `useReducedMotion()` hook. When enabled: no card rotation, instant transitions, no flash overlays, no score count-up animation.

7. **Keyboard controls alongside swipe.** Arrow keys and Y/N keys provide the same commit behavior as swipe gestures, making the game accessible to keyboard users. The swipe gesture is enhancement, not the only interaction path.
