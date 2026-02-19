export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'
export const TMDB_POSTER_SIZES = ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'] as const
export const TMDB_BACKDROP_SIZES = ['w300', 'w780', 'w1280', 'original'] as const

export const DEFAULT_LIST = 'now_playing' as const
export const DEFAULT_TRENDING_WINDOW = 'day' as const
export const STALE_TIME_MS = 15 * 60 * 1000 // 15 min
export const DETAIL_CONCURRENCY = 5
export const WATCH_PROVIDERS_REGION = 'US'

export const SORT_OPTIONS = [
  { value: 'momentum', label: 'Momentum' },
  { value: 'score', label: 'Audience Score' },
  { value: 'vote_count', label: 'Vote Count' },
  { value: 'release_date', label: 'Release Date' },
] as const
