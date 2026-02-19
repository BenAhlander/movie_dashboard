import { TMDB_IMAGE_BASE, TMDB_POSTER_SIZES, TMDB_BACKDROP_SIZES } from './constants'

export function posterUrl(path: string | null, size: (typeof TMDB_POSTER_SIZES)[number] = 'w342'): string {
  if (!path) return ''
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

export function backdropUrl(path: string | null, size: (typeof TMDB_BACKDROP_SIZES)[number] = 'w1280'): string {
  if (!path) return ''
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}
