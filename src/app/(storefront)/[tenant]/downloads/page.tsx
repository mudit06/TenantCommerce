import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getDownloadsPage } from '@/lib/data/catalog'
import { DOCUMENT_TYPES } from '@/modules/catalog'
import { getStoreContext } from '@/storefront/context'
import { DownloadsList } from '@/storefront/kit/downloads/DownloadsList'
import { mediaUrl } from '@/storefront/kit/media'
import { Container } from '@/storefront/kit/ui'

export const metadata: Metadata = { title: 'Downloads' }

type Props = { params: Promise<{ tenant: string }> }

const size = (bytes: number | null) =>
  bytes === null
    ? null
    : bytes >= 1_000_000
      ? `${(bytes / 1_000_000).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1000))} KB`

/**
 * Downloads (docs/screens storefront `st-downloads`): every document the store shows here, by
 * kind, searchable by product or model number. Files come straight from media storage.
 */
export default async function DownloadsPage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  if (!ctx.hasFeature('downloads')) notFound()
  const rows = await getDownloadsPage(ctx.store.tenantId)
  const label = new Map<string, string>(DOCUMENT_TYPES.map((t) => [t.value, t.label]))
  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    href: mediaUrl(r.url) ?? r.url,
    meta: [
      'PDF',
      size(r.sizeBytes),
      `updated ${new Date(r.updatedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}`,
    ]
      .filter(Boolean)
      .join(' · '),
    search: [r.title, label.get(r.type), ...r.products].join(' ').toLowerCase(),
  }))
  const tabs = DOCUMENT_TYPES.filter((t) => rows.some((r) => r.type === t.value)).map((t) => ({
    value: t.value as string,
    label: `${t.label}s`,
  }))

  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">Downloads</h1>
          <p className="mt-1 text-ink-soft">Catalogues, price lists, spec sheets and manuals.</p>
        </header>
        {items.length ? (
          <DownloadsList items={items} tabs={tabs} />
        ) : (
          <p className="text-ink-soft">Documents will be listed here soon.</p>
        )}
      </div>
    </Container>
  )
}
