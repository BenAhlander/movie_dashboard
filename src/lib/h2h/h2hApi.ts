import type {
  MatchupResponse,
  VoteResponse,
  LeaderboardResponse,
} from '@/types/h2h'

/**
 * Fetch the next unseen matchup for the current user.
 * Returns null when the pool is exhausted (204).
 */
export async function fetchMatchup(): Promise<MatchupResponse | null> {
  const res = await fetch('/api/h2h/matchup')

  if (res.status === 204) return null

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Failed to fetch matchup (${res.status})`)
  }

  return res.json()
}

/**
 * Submit a vote for a matchup.
 */
export async function submitVote(
  matchupId: string,
  winnerId: string
): Promise<VoteResponse> {
  const res = await fetch(`/api/h2h/matchups/${matchupId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winnerId }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Failed to submit vote (${res.status})`)
  }

  return res.json()
}

/**
 * Skip a matchup without voting.
 * For now this is a no-op — the matchup will naturally not be shown again
 * once the user votes. Skips just advance the client state.
 */
export async function skipMatchup(_matchupId: string): Promise<void> {
  // No server-side skip tracking for now.
  // The matchup may reappear in a future session since no vote was recorded.
}

/**
 * Fetch the leaderboard of top-rated films.
 */
export async function fetchLeaderboard(
  limit = 50,
  minVotes = 0
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams()
  if (limit !== 50) params.set('limit', String(limit))
  if (minVotes > 0) params.set('minVotes', String(minVotes))

  const qs = params.toString()
  const res = await fetch(`/api/h2h/leaderboard${qs ? `?${qs}` : ''}`)

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Failed to fetch leaderboard (${res.status})`)
  }

  return res.json()
}
