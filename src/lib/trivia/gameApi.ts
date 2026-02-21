import type {
  TriviaQuestion,
  LeaderboardRow,
  LeaderboardPeriod,
  ScoreTier,
} from '@/types/trivia'
import { triviaQuestions } from './mockQuestions'
import { mockLeaderboardEntries } from './mockLeaderboard'

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
  const pool = available.length >= QUESTIONS_PER_ROUND ? available : triviaQuestions
  return shuffle(pool).slice(0, QUESTIONS_PER_ROUND)
}

/**
 * Submit a completed game run. Currently a no-op that returns
 * the score. In a future version this would POST to an API.
 */
export function submitRun(score: number, total: number): { score: number; total: number } {
  return { score, total }
}

/**
 * Get leaderboard data with the current user inserted at the
 * appropriate rank based on their score.
 */
export function getLeaderboard(
  _period: LeaderboardPeriod,
  userScore: number,
  userTotal: number,
): LeaderboardRow[] {
  const userRow: Omit<LeaderboardRow, 'rank'> = {
    username: 'You',
    score: userScore,
    total: userTotal,
    isCurrentUser: true,
  }

  const allEntries = [...mockLeaderboardEntries, userRow]
  allEntries.sort((a, b) => b.score - a.score)

  return allEntries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))
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
