import { getStoreContext } from '@/storefront/context'

type Context = { params: Promise<{ tenant: string }> }

/**
 * The store's web app manifest (docs/13 "PWA", `st-offline` rule 2): its own name, icon and colour
 * from the store settings, so installing it puts the vendor's app on the phone.
 */
export async function GET(_request: Request, { params }: Context) {
  const ctx = await getStoreContext((await params).tenant)
  const name = ctx.settings?.storeName ?? ctx.store.name
  const theme = ctx.settings?.themeColor || ctx.ui.theme.brand
  const manifest = {
    name,
    short_name: name.length > 12 ? name.split(' ')[0] : name,
    description: ctx.ui.tagline || `${name} online store`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: theme,
    background_color: '#ffffff',
    icons: [
      { src: '/app-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/app-icon/512?maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
