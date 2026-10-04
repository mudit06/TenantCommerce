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

// Keyed by a stable id per handler, so re-importing a module (dev hot reload) replaces its
// handler instead of registering it twice
const handlers = new Map<EventName, Map<string, Handler<EventName>>>()

export function on<K extends EventName>(name: K, id: string, handler: Handler<K>): () => void {
  const byId = handlers.get(name) ?? new Map<string, Handler<EventName>>()
  byId.set(id, handler as Handler<EventName>)
  handlers.set(name, byId)
  return () => byId.delete(id)
}

export async function emit<K extends EventName>(
  name: K,
  event: PlatformEvents[K],
  context: { req: PayloadRequest },
): Promise<void> {
  for (const handler of handlers.get(name)?.values() ?? []) {
    await handler(event, context)
  }
}
