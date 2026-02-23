import { TriviaGame } from '@/components/trivia/TriviaGame'
import { hasAuthEnabled } from '@/lib/hasAuth'

export default function TriviaPage() {
  const authEnabled = hasAuthEnabled()
  return <TriviaGame authEnabled={authEnabled} />
}
