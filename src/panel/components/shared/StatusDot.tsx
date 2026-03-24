import type { RequestStatus } from '../../../shared/types'

export function StatusDot({ status }: { status: RequestStatus }) {
  return <span class={`status-dot status-dot--${status}`} />
}
