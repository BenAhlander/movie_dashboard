import { Dashboard } from '@/components/Dashboard'
import type { MovieListItem, StreamingListItem } from '@/types'

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT || 3000}`
}

export default async function Home() {
  const base = getBaseUrl()

  const [theaterRes, streamingRes] = await Promise.all([
    fetch(`${base}/api/theater`, { next: { revalidate: 900 } }).catch(
      () => null,
    ),
    fetch(`${base}/api/streaming?window=week`, {
      next: { revalidate: 900 },
    }).catch(() => null),
  ])

  const theaterData: { results: MovieListItem[]; demo?: boolean; error?: boolean } =
    theaterRes?.ok
      ? await theaterRes.json()
      : { results: [], demo: true, error: true }

  const streamingData: { results: StreamingListItem[]; demo?: boolean; error?: boolean } =
    streamingRes?.ok
      ? await streamingRes.json()
      : { results: [], demo: true, error: true }

  return (
    <Dashboard
      initialTheater={theaterData.results}
      initialStreaming={streamingData.results}
      isDemo={theaterData.demo || streamingData.demo || false}
      isApiUnreachable={theaterData.error || streamingData.error || false}
    />
  )
}
