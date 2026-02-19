/**
 * Scale TMDB popularity (highly variable) to a 0–100 "Hype" metric for display.
 * Uses log-like scaling so a few blockbusters don't dominate the scale.
 */
const POPULARITY_FLOOR = 1
const POPULARITY_CAP = 500

export function scalePopularityToHype(popularity: number): number {
  if (popularity <= 0) return 0
  const clamped = Math.min(Math.max(popularity, POPULARITY_FLOOR), POPULARITY_CAP)
  const normalized = (clamped - POPULARITY_FLOOR) / (POPULARITY_CAP - POPULARITY_FLOOR)
  return Math.round(Math.pow(normalized, 0.6) * 100)
}

export function audienceScorePercent(voteAverage: number): number {
  return Math.round(voteAverage * 10)
}
