import { HeadToHeadView } from '@/components/h2h/HeadToHeadView'
import { hasAuthEnabled } from '@/lib/hasAuth'

export default function HeadToHeadPage() {
  const authEnabled = hasAuthEnabled()
  return <HeadToHeadView authEnabled={authEnabled} />
}
