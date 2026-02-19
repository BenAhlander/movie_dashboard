import { FeedbackTab } from '@/components/feedback/FeedbackTab'
import { hasAuthEnabled } from '@/lib/hasAuth'

export default function FeedbackPage() {
  return <FeedbackTab authEnabled={hasAuthEnabled()} />
}
