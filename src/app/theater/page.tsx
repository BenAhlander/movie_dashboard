import { TheaterView } from '@/components/TheaterView'
import type { MovieListItem } from '@/types'

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT || 3000}`
}

export default async function TheaterPage() {
  const base = getBaseUrl()

  const res = await fetch(`${base}/api/theater`, {
    next: { revalidate: 900 },
  }).catch(() => null)

  const data: { results: MovieListItem[]; demo?: boolean; error?: boolean } =
    res?.ok ? await res.json() : { results: [], demo: true, error: true }

  return (
    <TheaterView
      initialTheater={data.results}
      isDemo={data.demo || false}
      isApiUnreachable={data.error || false}
    />
  )
}
