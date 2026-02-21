import type { LeaderboardRow } from '@/types/trivia'

/**
 * Mock leaderboard entries for display. The current user's row
 * is inserted dynamically by the game API based on their actual score.
 */
export const mockLeaderboardEntries: Omit<LeaderboardRow, 'rank'>[] = [
  { username: 'CinematicAlex', score: 20, total: 20 },
  { username: 'ReelTalk99', score: 19, total: 20 },
  { username: 'BlockbusterFan', score: 18, total: 20 },
  { username: 'NightOwlCinephile', score: 18, total: 20 },
  { username: 'PopcornPrince', score: 17, total: 20 },
  // Rank 6 is reserved for the current user
  { username: 'FilmNerd42', score: 15, total: 20 },
  { username: 'ScriptDoctor', score: 14, total: 20 },
  { username: 'IndieSleeper', score: 13, total: 20 },
  { username: 'MidnightMatinee', score: 12, total: 20 },
]
