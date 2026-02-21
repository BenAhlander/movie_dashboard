import { PollsTab } from '@/components/polls/PollsTab'
import { hasAuthEnabled } from '@/lib/hasAuth'

export default function PollsPage() {
  return <PollsTab authEnabled={hasAuthEnabled()} />
}
