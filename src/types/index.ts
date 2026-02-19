export type MovieListType = 'now_playing' | 'trending'
export type TrendingWindow = 'day' | 'week'

/** Primary app mode: Theater (box office) vs Streaming (trending) */
export type AppMode = 'theater' | 'streaming' | 'feedback'

export type MediaType = 'movie' | 'tv'

export interface MovieListItem {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
  overview?: string
  genre_ids?: number[]
  /** Enriched from detail for theater view */
  revenue?: number | null
  runtime?: number | null
  budget?: number | null
}

export interface MovieDetail extends MovieListItem {
  runtime: number | null
  genres: { id: number; name: string }[]
  tagline: string | null
  revenue?: number | null
  budget?: number | null
  imdb_id?: string | null
  credits?: Credits
  watch_providers?: WatchProviders
}

export interface Credits {
  cast: {
    id: number
    name: string
    character: string
    profile_path: string | null
  }[]
  crew: { id: number; name: string; job: string; profile_path: string | null }[]
}

export interface WatchProviders {
  results?: {
    US?: {
      link?: string
      flatrate?: { provider_name: string; logo_path: string }[]
      rent?: { provider_name: string; logo_path: string }[]
      buy?: { provider_name: string; logo_path: string }[]
    }
  }
}

/** Unified list item for streaming: movies + TV with media_type */
export interface StreamingListItem {
  id: number
  media_type: MediaType
  title: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
  overview?: string
  genre_ids?: number[]
}

/** Enrichment from OMDb when MODE B is enabled */
export interface Enrichment {
  imdbRating?: string | null
  imdbId?: string | null
  Metascore?: string | null
  Ratings?: { Source: string; Value: string }[]
}

export interface MoviesApiParams {
  list: MovieListType
  window?: TrendingWindow
}

export interface MoviesApiResponse {
  results: MovieListItem[]
  demo?: boolean
}

export interface MovieDetailsApiResponse {
  movie: MovieDetail
  enrichment?: Enrichment | null
  demo?: boolean
}

export type SortField = 'momentum' | 'score' | 'vote_count' | 'release_date'
export type SortDirection = 'asc' | 'desc'

export interface FilterState {
  list: MovieListType
  window: TrendingWindow
  search: string
  minScore: number
  sortBy: SortField
  sortDir: SortDirection
}

/** Theater mode: sort by revenue (box office), score, or release */
export type TheaterSort = 'revenue' | 'score' | 'release_date'

export type TrendDirection = 'up' | 'down' | 'flat'

/** Streaming mode: sort by trending (popularity) or score */
export type StreamingSort = 'trending' | 'score'

/** Streaming filter: all, movie only, tv only */
export type StreamingTypeFilter = 'all' | 'movie' | 'tv'

export interface TheaterFilters {
  search: string
  minScore: number
  sortBy: TheaterSort
  sortDir: SortDirection
}

export interface StreamingFilters {
  search: string
  minScore: number
  sortBy: StreamingSort
  sortDir: SortDirection
  typeFilter: StreamingTypeFilter
}

/* ── Feedback types ── */

export type FeedbackCategory = 'bug' | 'feature' | 'general'
export type FeedbackSort = 'hot' | 'new' | 'top'

export interface FeedbackPost {
  id: string
  title: string
  body: string
  category: FeedbackCategory
  score: number
  userVote: -1 | 0 | 1
  isOwner?: boolean
  created_at: string
  updated_at: string
}

export interface FeedbackFilters {
  sortBy: FeedbackSort
  category: FeedbackCategory | 'all'
}

export interface FeedbackFormData {
  title: string
  body: string
  category: FeedbackCategory
}
