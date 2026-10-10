import type { CollectionSlug, Payload, Where } from 'payload'

// Where a file is used (docs/screens/vendor-cms.md `cms-media` "Used in"): products and their
// finishes, categories, brands, banners, documents and the store's settings. Page blocks are
// not searched (their media sits inside block data); the file's own page says so.

export type MediaUse = { kind: string; title: string; collection: CollectionSlug; id: string }

const LOOKUPS: { collection: CollectionSlug; kind: string; fields: string[]; title: string }[] = [
  { collection: 'products', kind: 'Product', fields: ['gallery'], title: 'title' },
  { collection: 'variants', kind: 'Finish', fields: ['images'], title: 'sku' },
  {
    collection: 'categories',
    kind: 'Category',
    fields: ['image', 'banner', 'sizeChart'],
    title: 'name',
  },
  { collection: 'brands', kind: 'Brand', fields: ['logo'], title: 'name' },
  { collection: 'banners', kind: 'Banner', fields: ['image', 'mobileImage'], title: 'title' },
  { collection: 'product-documents', kind: 'Document', fields: ['file'], title: 'title' },
]

export async function mediaUsage(
  payload: Payload,
  tenantId: string,
  mediaId: string,
): Promise<MediaUse[]> {
  const found = await Promise.all(
    LOOKUPS.map(async ({ collection, kind, fields, title }) => {
      const where: Where = {
        and: [
          { tenant: { equals: tenantId } },
          { or: fields.map((field) => ({ [field]: { in: [mediaId] } })) },
        ],
      }
      const { docs } = await payload.find({
        collection,
        where,
        depth: 0,
        limit: 20,
        overrideAccess: true,
      })
      return docs.map((doc) => ({
        kind,
        title: String((doc as unknown as Record<string, unknown>)[title] ?? 'Untitled'),
        collection,
        id: String(doc.id),
      }))
    }),
  )
  return found.flat()
}
