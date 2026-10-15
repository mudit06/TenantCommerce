import type { Metadata, Viewport } from 'next'
import { Suspense, type CSSProperties, type ReactNode } from 'react'

import type { StoreContext } from '../../context'
import { mediaUrl } from '../media'
import { PwaSetup } from '../pwa/PwaSetup'
import { storeWhatsApp } from '../whatsapp'
import { BottomNav } from './BottomNav'
import { Footer as KitFooter } from './Footer'
import { Header as KitHeader } from './Header'
import { NavigationLoader } from './NavigationLoader'
import { StoreMessage } from './StoreMessage'
import { WhatsAppFloat } from './WhatsAppFloat'

// The store's whole document (<html> to the footer), shared by the shoppers' layout
// (src/app/(storefront)/[tenant]) and the editor's draft preview (src/app/(preview)).

export function storeMetadata(ctx: StoreContext): Metadata {
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
    description: `${name}: ${ctx.categories.roots.map((root) => root.name.toLowerCase()).join(', ') || 'products'}. ${ctx.selling.selling ? 'Buy online with prices including GST.' : 'Ask for a quote online.'}`,
    applicationName: name,
    icons: { ...(favicon ? { icon: favicon } : {}), apple: '/app-icon/180' },
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: name, statusBarStyle: 'default' },
    openGraph: { siteName: name, type: 'website', images: ogImage ? [ogImage] : undefined },
    // Draft stores are previews: keep them out of search engines
    robots: ctx.store.status === 'active' ? undefined : { index: false, follow: false },
  }
}

export const storeViewport = (ctx: StoreContext): Viewport => ({
  themeColor: ctx.settings?.themeColor || ctx.ui.theme.brand,
})

/** Why the store shows a notice instead of its pages, or null while it is open. */
export function closedMessage(ctx: StoreContext): { title: string; body: string } | null {
  const name = ctx.settings?.storeName ?? ctx.store.name
  const preview = ctx.store.status === 'draft'
  if (ctx.store.status === 'suspended') {
    return {
      title: 'Store unavailable',
      body: 'This store is not taking visitors at the moment. Please check back later.',
    }
  }
  if (!ctx.settings?.maintenanceMode && !(preview && process.env.NODE_ENV === 'production')) {
    return null
  }
  return preview
    ? {
        title: `${name} is coming soon`,
        body: 'We are getting the store ready. Please check back soon.',
      }
    : {
        title: `${name} will be back soon`,
        body: 'We are making a few changes to the store. Please check back in a little while.',
      }
}

export function StoreDocument({
  ctx,
  closed,
  children,
}: {
  ctx: StoreContext
  /** The notice shown instead of the store's pages (suspended, coming soon, maintenance) */
  closed: { title: string; body: string } | null
  children: ReactNode
}) {
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
  const Header = ctx.ui.Header ?? KitHeader
  const Footer = ctx.ui.Footer ?? KitFooter
  const preview = ctx.store.status === 'draft'

  return (
    // Store settings → Branding → Animations (on unless switched off; globals.css "Motion")
    <html
      data-motion={ctx.settings?.animations === false ? 'off' : undefined}
      lang="en-IN"
      style={style}
    >
      <body>
        {closed ? (
          <StoreMessage title={closed.title}>{closed.body}</StoreMessage>
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
            <BottomNav dealers={ctx.hasFeature('dealer-locator')} selling={ctx.selling.selling} />
            <PwaSetup icon="/app-icon/192" storeName={name} />
            <Suspense fallback={null}>
              <NavigationLoader />
            </Suspense>
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
