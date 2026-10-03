import type { Tone } from '.'

export const TENANT_STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  active: 'success',
  suspended: 'danger',
  archived: 'neutral',
}

export const SUBSCRIPTION_STATUS_TONE: Record<string, Tone> = {
  trialing: 'info',
  active: 'success',
  past_due: 'danger',
  paused: 'warning',
  cancelled: 'neutral',
}

export const labelOf = (value: string) =>
  (value.charAt(0).toUpperCase() + value.slice(1)).replace(/_/g, ' ')
