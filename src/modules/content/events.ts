import { on } from '@/lib/events'

import { ensureStoreDefaults } from './services/storeDefaults'

/** Handlers this module registers (docs/01: cross-module side effects go through events). */
export function registerContentEvents(): void {
  on('tenant.created', 'content:store-defaults', ({ tenantId }, { req }) =>
    ensureStoreDefaults(req, tenantId),
  )
}
