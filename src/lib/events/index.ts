import type { PayloadRequest } from 'payload'

// Tiny in-process event bus (docs/01). Handlers run in the emitter's request, so they share its
// transaction; anything slow or retryable must enqueue a job instead of doing the work inline.

export type PlatformEvents = {
  /** A store was onboarded. Content, tax and other modules seed their per-store defaults. */
  'tenant.created': { tenantId: string }
  /** draft -> active, active <-> suspended, -> archived */
  'tenant.status-changed': { tenantId: string; from: string; to: string }
  /** A feature switch changed (cache revalidation, module side effects). */
  'feature.changed': { tenantId: string; key: string; enabled: boolean }
}

export type EventName = keyof PlatformEvents
type Handler<K extends EventName> = (
  event: PlatformEvents[K],
  context: { req: PayloadRequest },
) => Promise<void> | void

const handlers = new Map<EventName, Set<Handler<EventName>>>()

export function on<K extends EventName>(name: K, handler: Handler<K>): () => void {
  const set = handlers.get(name) ?? new Set()
  set.add(handler as Handler<EventName>)
  handlers.set(name, set)
  return () => set.delete(handler as Handler<EventName>)
}

export async function emit<K extends EventName>(
  name: K,
  event: PlatformEvents[K],
  context: { req: PayloadRequest },
): Promise<void> {
  for (const handler of handlers.get(name) ?? []) {
    await handler(event, context)
  }
}
