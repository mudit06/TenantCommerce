import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import type { CSSProperties, ReactNode } from 'react'

import { PREVIEW_PAGE_HEADER } from '@/storefront/constants'
import { getStoreContext } from '@/storefront/context'
import { Footer } from '@/storefront/kit/layout/Footer'
import { Header } from '@/storefront/kit/layout/Header'
import { StoreMessage } from '@/storefront/kit/layout/StoreMessage'
import { WhatsAppFloat } from '@/storefront/kit/layout/WhatsAppFloat'
import { PwaSetup } from '@/storefront/kit/pwa/PwaSetup'
import { mediaUrl } from '@/storefront/kit/media'
import { storeWhatsApp } from '@/storefront/kit/whatsapp'

import './globals.css'

type Props = { children: ReactNode; params: Promise<{ tenant: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await getStoreContext((await params).tenant)
  const name = ctx.settings?.storeName ?? ctx.store.name
  const template = ctx.settings?.seoDefaults?.titleTemplate || `%s · ${name}`
  const favicon =
    typeof ctx.settings?.favicon === 'object' ? mediaUrl(ctx.settings?.favicon?.url) : undefined
  const ogImage =
    typeof ctx.settings?.seoDefaults?.ogImage === 'object'
      ? mediaUrl(ctx.settings.seoDefaults.ogImage?.url)
      : undefined
  return {
    metadataBase: new URL(ctx.origin),
    title: { default: ctx.ui.tagline ? `${name} · ${ctx.ui.tagline}` : name, template },
    description: `${name}: ${ctx.categories.roots.map((root) => root.name.toLowerCase()).join(', ') || 'products'}. Ask for a quote online.`,
    applicationName: name,
    icons: { ...(favicon ? { icon: favicon } : {}), apple: '/app-icon/180' },
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: name, statusBarStyle: 'default' },
    openGraph: { siteName: name, type: 'website', images: ogImage ? [ogImage] : undefined },
    // Draft stores are previews: keep them out of search engines
    robots: ctx.store.status === 'active' ? undefined : { index: false, follow: false },
  }
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const ctx = await getStoreContext((await params).tenant)
  return { themeColor: ctx.settings?.themeColor || ctx.ui.theme.brand }
}

/** Every shopper page of a store (docs/03 `app/(storefront)/[tenant]`). */
export default async function StoreLayout({ children, params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const theme = ctx.ui.theme
  const style = {
    '--brand': theme.brand,
    '--brand-ink': theme.brandInk,
    '--accent': theme.accent,
    '--ink': theme.ink,
    '--ink-soft': theme.inkSoft,
    '--line': theme.line,
    '--surface': theme.surface,
    '--surface-alt': theme.surfaceAlt,
    '--dark': theme.dark,
    '--radius': theme.radius,
    '--font-heading-family': theme.fontHeading,
    '--font-body-family': theme.fontBody,
    '--heading-transform': theme.headingTransform,
  } as CSSProperties
  const name = ctx.settings?.storeName ?? ctx.store.name
  const preview = ctx.store.status === 'draft'
  // The editor's draft preview (signed link, checked by the proxy and again by the page) shows the
  // store as it will look, even before launch or during maintenance
  const editorPreview = Boolean((await headers()).get(PREVIEW_PAGE_HEADER))
  const closed =
    !editorPreview &&
    (ctx.store.status === 'suspended' ||
      Boolean(ctx.settings?.maintenanceMode) ||
      (preview && process.env.NODE_ENV === 'production'))
  const closedMessage =
    ctx.store.status === 'suspended'
      ? {
          title: 'Store unavailable',
          body: 'This store is not taking visitors at the moment. Please check back later.',
        }
      : preview
        ? {
            title: `${name} is coming soon`,
            body: 'We are getting the store ready. Please check back soon.',
          }
        : {
            title: `${name} will be back soon`,
            body: 'We are making a few changes to the store. Please check back in a little while.',
          }

  return (
    <html lang="en-IN" style={style}>
      <body>
        {closed ? (
          <StoreMessage title={closedMessage.title}>{closedMessage.body}</StoreMessage>
        ) : (
          <>
            <a
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
              href="#main"
            >
              Skip to content
            </a>
            {preview ? (
              <p className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
                Preview: this store is not live yet, so search engines don’t list it.
              </p>
            ) : null}
            <Header ctx={ctx} />
            <main className="pb-16 lg:pb-0" id="main">
              {children}
            </main>
            <Footer ctx={ctx} />
            <PwaSetup icon="/app-icon/192" storeName={name} />
            <WhatsAppFloat
              href={storeWhatsApp(
                ctx.settings?.contact?.whatsapp,
                `Hello ${name}, I have a question.`,
              )}
            />
          </>
        )}
      </body>
    </html>
  )
}
