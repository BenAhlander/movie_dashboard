import type {
  TriviaQuestion,
  LeaderboardRow,
  LeaderboardPeriod,
  ScoreTier,
  SubmitRunResponse,
} from '@/types/trivia'
import { triviaQuestions } from './mockQuestions'


export const QUESTIONS_PER_ROUND = 5

/** Fisher-Yates shuffle */
function shuffle<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Get a shuffled set of questions for a game round.
 * Excludes questions with IDs in the excludeIds set to avoid repeats.
 * In a future version this would call an API endpoint.
 */
export function getQuestions(excludeIds: string[] = []): TriviaQuestion[] {
  const excludeSet = new Set(excludeIds)
  const available = triviaQuestions.filter((q) => !excludeSet.has(q.id))
  // If we've used most questions, reset the pool
  const pool =
    available.length >= QUESTIONS_PER_ROUND ? available : triviaQuestions
  return shuffle(pool).slice(0, QUESTIONS_PER_ROUND)
}

/** API response shape from GET /api/trivia/leaderboard */
interface LeaderboardApiRow {
  rank: number
  userId: string
  username: string
  avatarUrl: string | null
  score: number
  total: number
  pct: number
}

/**
 * Submit a completed game run. POSTs to the API when authenticated,
 * returns { saved: false } when not.
 */
export async function submitRun(
  score: number,
  total: number,
  isAuthenticated: boolean
): Promise<SubmitRunResponse> {
  if (!isAuthenticated) return { saved: false }

  try {
    const res = await fetch('/api/trivia/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, total }),
    })
    if (!res.ok) {
      console.warn('submitRun failed:', res.status, await res.text())
      return { saved: false }
    }
    const data = await res.json()
    return { saved: true, rank: data.rank }
  } catch {
    return { saved: false }
  }
}

/**
 * Get leaderboard data from the API. Falls back to mock data
 * if the API is unavailable or in demo mode.
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  currentUserId?: string
): Promise<LeaderboardRow[]> {
  try {
    const res = await fetch(`/api/trivia/leaderboard?period=${period}`)
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()

    // Demo mode or empty leaderboard — return empty
    if (data.demo || !data.rows?.length) {
      return []
    }

    return (data.rows as LeaderboardApiRow[]).map((row) => ({
      rank: row.rank,
      username: row.username,
      score: row.score,
      total: row.total,
      pct: row.pct,
      avatarUrl: row.avatarUrl,
      userId: row.userId,
      isCurrentUser: currentUserId ? row.userId === currentUserId : false,
    }))
  } catch (err) {
    console.warn('getLeaderboard failed:', err)
    return []
  }
}

/**
 * Get the ghost rank for an anonymous user's score.
 * Returns the rank their score would achieve and the total player count.
 */
export async function getGhostRank(
  score: number,
  total: number,
  period: LeaderboardPeriod = 'today'
): Promise<{ rank: number; totalPlayers: number }> {
  try {
    const res = await fetch(
      `/api/trivia/leaderboard/rank?score=${score}&total=${total}&period=${period}`
    )
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()
    return { rank: data.rank, totalPlayers: data.totalPlayers }
  } catch {
    return { rank: 1, totalPlayers: 0 }
  }
}

/** Score tier messages — scaled for 5-question rounds */
export const scoreTiers: ScoreTier[] = [
  { min: 5, max: 5, message: 'Perfect Round!' },
  { min: 4, max: 4, message: 'Almost Flawless!' },
  { min: 3, max: 3, message: 'Solid Knowledge!' },
  { min: 2, max: 2, message: 'Getting There!' },
  { min: 0, max: 1, message: 'Keep Watching!' },
]

/** Get the tier message for a round score (out of 5) */
export function getScoreMessage(score: number): string {
  const tier = scoreTiers.find((t) => score >= t.min && score <= t.max)
  return tier?.message ?? ''
}

/** Get the color for the percentage display on the results screen */
export function getScoreColor(score: number, total: number): string {
  const pct = total > 0 ? score / total : 0
  if (pct >= 0.9) return '#22c55e'
  if (pct >= 0.7) return '#f59e0b'
  if (pct >= 0.5) return 'text.primary'
  return 'text.secondary'
}
