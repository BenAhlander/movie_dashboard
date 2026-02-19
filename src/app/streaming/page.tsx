import { StreamingView } from '@/components/StreamingView'
import type { StreamingListItem } from '@/types'

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return `http://localhost:${process.env.PORT || 3000}`
}

export default async function StreamingPage() {
  const base = getBaseUrl()

  const res = await fetch(`${base}/api/streaming?window=week`, {
    next: { revalidate: 900 },
  }).catch(() => null)

  const data: {
    results: StreamingListItem[]
    demo?: boolean
    error?: boolean
  } = res?.ok ? await res.json() : { results: [], demo: true, error: true }

  return (
    <StreamingView
      initialStreaming={data.results}
      isDemo={data.demo || false}
      isApiUnreachable={data.error || false}
    />
  )
}
