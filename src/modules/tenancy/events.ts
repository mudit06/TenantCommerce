// Events this module emits (handlers live in the modules that react to them, docs/01):
// - tenant.created         after onboarding; content/tax modules seed per-store defaults
// - tenant.status-changed  draft/active/suspended/archived moves
// - feature.changed        a feature switch flipped (caches, module side effects)
export type { PlatformEvents } from '@/lib/events'
