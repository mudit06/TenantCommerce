import { getGlobalViewRedirect } from '@payloadcms/plugin-multi-tenant/rsc'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Payload, TypedUser, ViewTypes } from 'payload'

import { currentStore } from '@/admin/store'

const SELECTED_STORE_COOKIE = 'payload-tenant'

type Args = {
  collectionSlug?: string
  docID?: number | string
  globalSlugs?: string[]
  payload: Payload
  tenantFieldName: string
  tenantsArrayFieldName: string
  tenantsArrayTenantFieldName: string
  tenantsCollectionSlug: string
  useAsTitle: string
  user?: TypedUser
  userHasAccessToAllTenants: (user: unknown) => boolean
  viewType?: ViewTypes
}

/** The request's headers with the selected-store cookie set to `storeId`. */
function withSelectedStore(headers: Headers, storeId: string): Headers {
  const cookies = (headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${SELECTED_STORE_COOKIE}=`))
  const next = new Headers(headers)
  next.set('cookie', [...cookies, `${SELECTED_STORE_COOKIE}=${storeId}`].join('; '))
  return next
}

/**
 * Store settings and Menus are one document per store (the multi-tenant plugin's `isGlobal`):
 * their list address opens the store's document. The plugin picks the store from its cookie,
 * else the first store the person can see, which for our team in a store session is whichever
 * store sorts first, not the one in the session. That document is then refused by the session's
 * access, Payload sends "not found" back to the list, and the list redirects again: a loop that
 * shows a blank page (QA S1/S2). This is the plugin's redirect with the store the CMS page is
 * about (`currentStore`: the session's store, else the chosen store if it is the person's, else
 * their first store). Our platform panel keeps the plugin's own choice.
 */
export async function GlobalViewRedirect(args: Args) {
  const { collectionSlug, payload, user } = args
  if (!collectionSlug || !args.globalSlugs?.includes(collectionSlug)) return null
  const store = await currentStore(payload, user)
  const headers = store ? withSelectedStore(await getHeaders(), store.id) : await getHeaders()
  const redirectRoute = await getGlobalViewRedirect({
    slug: collectionSlug,
    docID: args.docID,
    headers,
    payload,
    tenantFieldName: args.tenantFieldName,
    tenantsArrayFieldName: args.tenantsArrayFieldName,
    tenantsArrayTenantFieldName: args.tenantsArrayTenantFieldName,
    tenantsCollectionSlug: args.tenantsCollectionSlug,
    useAsTitle: args.useAsTitle,
    user,
    userHasAccessToAllTenants: args.userHasAccessToAllTenants,
    view: args.viewType ?? 'list',
  })
  if (redirectRoute) redirect(redirectRoute)
  return null
}
