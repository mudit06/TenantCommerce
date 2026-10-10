import type { ListViewServerProps, Where } from 'payload'

import { idOf, MEDIA_WRITE, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, Card, EmptyState, PageHeader, UsageBar } from '@/admin/ui'
import { ListToolbar } from '@/admin/ui/ListToolbar'
import { Pager } from '@/admin/ui/Pager'
import type { Media } from '@/payload-types'

import { DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES } from '../collections/Media'
import { mediaUsage } from '../services/mediaUsage'
import { MediaAltForm, MediaDeleteButton } from './MediaActions'

const PAGE_SIZE = 40
const TABS = [
  { key: 'all', label: 'All' },
  { key: 'images', label: 'Images' },
  { key: 'documents', label: 'Documents' },
  { key: 'videos', label: 'Videos' },
] as const

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

const size = (bytes: number | null | undefined) =>
  !bytes
    ? '—'
    : bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toLocaleString('en-IN', { maximumFractionDigits: 1 })} MB`
      : `${Math.round(bytes / 1024)} KB`

const extension = (file: Pick<Media, 'filename' | 'mimeType'>) =>
  (file.filename?.split('.').pop() ?? file.mimeType?.split('/').pop() ?? 'file').toUpperCase()

/**
 * Media library (docs/screens/vendor-cms.md `cms-media`): every photo and document the store
 * uses as a grid, with alt text, sizes and where each file is used beside it. Product videos are
 * YouTube links, listed on the Videos tab. Replaces Payload's list.
 */
export async function MediaLibrary({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its media.
        </EmptyState>
      </div>
    )
  }
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : storeRolesOf(user, store.id).some((role) => MEDIA_WRITE.includes(role))

  const params = new URLSearchParams()
  for (const key of ['tab', 'q', 'file', 'page']) {
    const value = param(searchParams?.[key])
    if (value) params.set(key, value)
  }
  const tab = params.get('tab') ?? 'all'
  const q = params.get('q')?.trim() ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const scope: Where = { tenant: { equals: store.id } }
  const searched: Where[] = q ? [{ or: [{ filename: { like: q } }, { alt: { like: q } }] }] : []
  const kindWhere: Record<string, Where> = {
    images: { mimeType: { in: IMAGE_MIME_TYPES } },
    documents: { mimeType: { in: DOCUMENT_MIME_TYPES } },
  }

  const [counts, tenant, products] = await Promise.all([
    Promise.all(
      (['all', 'images', 'documents'] as const).map(async (key) => {
        const { totalDocs } = await payload.count({
          collection: 'media',
          where: { and: [scope, ...searched, ...(kindWhere[key] ? [kindWhere[key]!] : [])] },
          overrideAccess: true,
        })
        return [key, totalDocs] as const
      }),
    ).then((rows) => Object.fromEntries(rows) as Record<string, number>),
    payload.findByID({ collection: 'tenants', id: store.id, depth: 1, overrideAccess: true }),
    // Product videos are YouTube links on products, not uploaded files
    payload.find({
      collection: 'products',
      where: { and: [scope, { 'videos.url': { exists: true } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { title: true, videos: true },
    }),
  ])
  const videos = products.docs.flatMap((product) =>
    (product.videos ?? []).map((video) => ({ product, video })),
  )
  counts.videos = videos.length

  const { docs: files, totalDocs } =
    tab === 'videos'
      ? { docs: [] as Media[], totalDocs: 0 }
      : await payload.find({
          collection: 'media',
          where: { and: [scope, ...searched, ...(kindWhere[tab] ? [kindWhere[tab]!] : [])] },
          sort: '-createdAt',
          depth: 0,
          limit: PAGE_SIZE,
          page,
          overrideAccess: true,
        })

  const selectedId = params.get('file')
  const selected = selectedId
    ? await payload
        .findByID({ collection: 'media', id: selectedId, depth: 0, overrideAccess: true })
        .catch(() => null)
    : null
  const selectedOk = selected && idOf(selected.tenant) === store.id
  const uses = selectedOk ? await mediaUsage(payload, store.id, String(selected.id)) : []

  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    const query = next.toString()
    return query ? `${adminUrl.collection('media')}?${query}` : adminUrl.collection('media')
  }
  const isImage = (file: Pick<Media, 'mimeType'>) => IMAGE_MIME_TYPES.includes(file.mimeType ?? '')

  return (
    <div className="te-page">
      <PageHeader
        actions={
          canWrite ? (
            <ButtonLink href={adminUrl.create('media')} icon="upload" variant="primary">
              Upload
            </ButtonLink>
          ) : null
        }
        eyebrow={store.name}
        subtitle={`${counts.all?.toLocaleString('en-IN')} files`}
        title="Media"
      />
      <div className="te-media-bar">
        <nav aria-label="File type" className="te-tabs te-tabs--underline">
          {TABS.map(({ key, label }) => (
            <a
              aria-current={tab === key ? 'page' : undefined}
              className={`te-tab${tab === key ? ' te-tab--active' : ''}`}
              href={hrefWith({ tab: key === 'all' ? null : key, page: null, file: null })}
              key={key}
            >
              {label} <span className="te-tab__count">{counts[key] ?? 0}</span>
            </a>
          ))}
        </nav>
        <div className="te-media-bar__storage">
          <UsageBar
            format={(n) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} GB`}
            label="Storage"
            limit={plan?.limits?.maxStorageGB}
            used={(tenant.usage?.storageBytes ?? 0) / 1024 ** 3}
          />
        </div>
      </div>
      {tab !== 'videos' ? (
        <ListToolbar
          initial={{ q }}
          searchLabel="Search media"
          searchPlaceholder="Search file name or alt text"
        />
      ) : null}

      <div className={selectedOk ? 'te-grid te-grid--3-1' : undefined}>
        <div>
          {tab === 'videos' ? (
            videos.length ? (
              <Card className="te-card--flush" title="Product videos">
                <table className="te-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Video</th>
                      <th>Kind</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map(({ product, video }, index) => (
                      <tr key={`${product.id}-${index}`}>
                        <td>
                          <a className="te-link" href={adminUrl.doc('products', product.id)}>
                            {product.title}
                          </a>
                        </td>
                        <td>
                          <a
                            className="te-link te-small"
                            href={video.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {video.url}
                          </a>
                        </td>
                        <td className="te-small">{video.type ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ) : (
              <EmptyState icon="media" title="No product videos">
                Add YouTube links to a product under Photos and videos; they show here.
              </EmptyState>
            )
          ) : files.length ? (
            <ul className="te-media-grid">
              {files.map((file) => (
                <li key={file.id}>
                  <a
                    aria-current={selectedId === String(file.id) ? 'true' : undefined}
                    className={`te-media-tile${selectedId === String(file.id) ? ' te-media-tile--selected' : ''}`}
                    href={hrefWith({ file: String(file.id) })}
                    title={file.alt || file.filename || undefined}
                  >
                    {isImage(file) ? (
                      <span
                        aria-hidden
                        className="te-media-tile__image"
                        style={{
                          backgroundImage: `url(${file.sizes?.thumb?.url ?? file.url ?? ''})`,
                        }}
                      />
                    ) : (
                      <span aria-hidden className="te-media-tile__doc">
                        {extension(file)}
                      </span>
                    )}
                    <span className="te-media-tile__name te-mono">{file.filename}</span>
                    {isImage(file) && !file.alt ? (
                      <span className="te-media-tile__flag">No alt text</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="media" title={counts.all ? 'No files match' : 'No files yet'}>
              {counts.all
                ? 'Try another tab or clear the search.'
                : 'Upload product photos, banners and PDFs. Images are resized for phones and desktops automatically.'}
            </EmptyState>
          )}
          <Pager
            base={adminUrl.collection('media')}
            page={page}
            pageSize={PAGE_SIZE}
            params={params}
            total={totalDocs}
          />
        </div>

        {selectedOk ? (
          <Card
            actions={
              <a className="te-link te-small" href={hrefWith({ file: null })}>
                Close
              </a>
            }
            className="te-media-detail"
            title={<span className="te-mono">{selected.filename}</span>}
          >
            {isImage(selected) ? (
              <span
                aria-hidden
                className="te-media-detail__preview"
                style={{
                  backgroundImage: `url(${selected.sizes?.card?.url ?? selected.url ?? ''})`,
                }}
              />
            ) : (
              <a
                className="te-media-detail__doc"
                href={selected.url ?? '#'}
                rel="noreferrer"
                target="_blank"
              >
                {extension(selected)} · open
              </a>
            )}
            <MediaAltForm
              alt={selected.alt ?? ''}
              canWrite={canWrite}
              id={String(selected.id)}
              required={isImage(selected)}
            />
            <dl className="te-dl">
              <dt>Type</dt>
              <dd>
                {extension(selected)} · {size(selected.filesize)}
              </dd>
              {selected.width && selected.height ? (
                <>
                  <dt>Size</dt>
                  <dd>
                    {selected.width} × {selected.height}
                  </dd>
                </>
              ) : null}
              {isImage(selected) ? (
                <>
                  <dt>Versions</dt>
                  <dd>
                    {Object.values(selected.sizes ?? {}).filter((s) => s?.url).length + 1} sizes
                    made
                  </dd>
                </>
              ) : null}
              <dt>Used in</dt>
              <dd>
                {uses.length ? (
                  <ul className="te-plain-list">
                    {uses.map((use) => (
                      <li key={`${use.collection}-${use.id}`}>
                        <span className="te-muted">{use.kind}:</span>{' '}
                        <a className="te-link" href={adminUrl.doc(use.collection, use.id)}>
                          {use.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="te-muted">Not used by products, categories or banners</span>
                )}
              </dd>
            </dl>
            {canWrite ? (
              <div className="te-button-row">
                <ButtonLink href={adminUrl.doc('media', selected.id)} size="small">
                  Replace
                </ButtonLink>
                <MediaDeleteButton
                  filename={selected.filename ?? 'this file'}
                  id={String(selected.id)}
                />
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  )
}
