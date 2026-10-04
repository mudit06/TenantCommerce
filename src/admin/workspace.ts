import type { CollectionConfig } from 'payload'

import { workspaceOf, type Workspace } from '@/access'

// The platform panel and a store's CMS are separate workspaces of the one admin (docs/05): our
// team sees platform screens, and a store's screens only while a store session is open; store
// staff only ever see their store. Hidden collections drop out of the menu and their admin routes
// answer "not found", so a screen of the other workspace can't be opened by its address either.
// Access control stays the real guard (src/access).

type Hidden = NonNullable<NonNullable<CollectionConfig['admin']>['hidden']>

const showOnlyIn =
  (workspace: Workspace) =>
  (config: CollectionConfig): CollectionConfig => {
    const existing = config.admin?.hidden
    const hidden: Hidden = (args) =>
      workspaceOf(args.user) !== workspace ||
      (typeof existing === 'function' ? existing(args) : Boolean(existing))
    return { ...config, admin: { ...config.admin, hidden } }
  }

/** A store collection's screens: shown in a store's CMS only. */
export const storeScreen = showOnlyIn('store')

/** A platform collection's screens: shown in the platform panel only. */
export const platformScreen = showOnlyIn('platform')
