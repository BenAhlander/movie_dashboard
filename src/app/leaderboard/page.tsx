import { LeaderboardPageView } from '@/components/LeaderboardPageView'
import { hasAuthEnabled } from '@/lib/hasAuth'

export default function LeaderboardPage() {
  const authEnabled = hasAuthEnabled()
  return <LeaderboardPageView authEnabled={authEnabled} />
}
