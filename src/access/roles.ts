// Role names live here only; collections import them, never inline strings (docs/05).

export const PLATFORM_ROLES = ['super-admin', 'support'] as const
export type PlatformRole = (typeof PLATFORM_ROLES)[number]

export const TENANT_ROLES = [
  'owner',
  'manager',
  'catalog-editor',
  'order-manager',
  'content-editor',
  'support',
] as const
export type TenantRole = (typeof TENANT_ROLES)[number]

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  'super-admin': 'Super admin',
  support: 'Support',
}

export const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  'catalog-editor': 'Catalog editor',
  'order-manager': 'Order manager',
  'content-editor': 'Content editor',
  support: 'Support',
}

export const USER_STATUSES = ['invited', 'active', 'disabled'] as const
export type UserStatus = (typeof USER_STATUSES)[number]
