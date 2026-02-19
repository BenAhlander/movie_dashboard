import type { Enrichment } from '../../types'

/**
 * MODE B: When OMDb API key is configured server-side, the /api/movie/:id/details
 * endpoint can return enrichment with IMDb and Rotten Tomatoes.
 * This module is for type/display only; actual enrichment is done in API if implemented.
 */
export function getImdbFromEnrichment(enrichment: Enrichment | null | undefined): string | null {
  if (!enrichment?.imdbRating) return null
  return enrichment.imdbRating
}

export function getRottenTomatoesFromEnrichment(enrichment: Enrichment | null | undefined): string | null {
  if (!enrichment?.Ratings?.length) return null
  const rt = enrichment.Ratings.find((r) => r.Source === 'Rotten Tomatoes')
  return rt?.Value ?? null
}
