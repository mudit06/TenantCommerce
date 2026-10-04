import path from 'node:path'

import { getTenantFromCookie } from '@payloadcms/plugin-multi-tenant/utilities'
import { APIError, type CollectionConfig, type PayloadRequest, type TextField } from 'payload'

import {
  ANY_STORE_ROLE,
  idOf,
  MEDIA_WRITE,
  storeSessionOf,
  tenantIdsWithRoles,
  tenantRoleOrPlatform,
} from '@/access'
import { adjustStorageUsage, assertStorageAvailable } from '@/modules/tenancy'

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const DOCUMENT_MIME_TYPES = ['application/pdf']
const MB = 1024 * 1024
/** docs/06 media: 10 MB images, 50 MB PDFs */
export const MAX_IMAGE_BYTES = 10 * MB
export const MAX_DOCUMENT_BYTES = 50 * MB

const isImage = (mimeType: unknown) => typeof mimeType === 'string' && mimeType.startsWith('image/')

type SizedDoc = {
  filesize?: number | null
  sizes?: Record<string, { filesize?: number | null } | undefined> | null
}

/** Bytes a file takes in storage: the original plus every generated size. */
export const storedBytes = (doc: SizedDoc | null | undefined): number =>
  (doc?.filesize ?? 0) +
  Object.values(doc?.sizes ?? {}).reduce((sum, size) => sum + (size?.filesize ?? 0), 0)

/**
 * Each store's files live in their own folder of the bucket, `media/<store id>/<file>` (docs/12
 * "Media"): a store's files can be listed, exported, backed up or removed on their own, and one
 * store's uploads never sit among another's. The storage plugin keeps this field and joins it
 * under the collection prefix; it is the form's default, so uploads straight from the browser
 * (S3_CLIENT_UPLOADS) land in the same folder as uploads through the server. Files uploaded
 * before keep the folder they were stored in.
 */
const storeFolderField: TextField = {
  name: 'prefix',
  type: 'text',
  admin: { hidden: true },
  defaultValue: ({ req, user }: { req: PayloadRequest; user?: unknown }) => {
    const session = storeSessionOf(user)
    if (session) return session.tenantId
    const stores = tenantIdsWithRoles(user, MEDIA_WRITE)
    const selected = req?.headers ? getTenantFromCookie(req.headers, 'text') : null
    return selected && stores.includes(String(selected)) ? String(selected) : stores[0]
  },
}

/** Payload serves files at /api/media/file/<name>; anyone may fetch a file, nobody may list. */
const isFileRequest = (req: PayloadRequest) =>
  typeof req.url === 'string' && /\/api\/media\/file\//.test(req.url)

/**
 * The store's photos and documents (docs/06 media, docs/screens Media library). Files live in
 * object storage behind a CDN in production (S3 or Cloudflare R2, see payload.config) and on
 * local disk in development; MongoDB keeps only the metadata. Images are resized on upload into
 * four WebP sizes, the stored original is capped at 2000 px, and EXIF data (camera, GPS) is
 * dropped by the re-encode.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'File', plural: 'Media' },
  admin: {
    group: 'Catalog',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt'],
    listSearchableFields: ['filename', 'alt'],
    description: 'Photos and PDFs. Images are resized for phones and desktops automatically.',
  },
  access: {
    read: async (args) => {
      // Files are public by address (shoppers, previews, signed-in staff of any workspace alike,
      // docs/12 "Media"); listing the library stays staff-only per store
      if (isFileRequest(args.req)) return true
      return tenantRoleOrPlatform({ roles: ANY_STORE_ROLE, supportCanAccess: true })(args)
    },
    create: tenantRoleOrPlatform({ roles: MEDIA_WRITE }),
    update: tenantRoleOrPlatform({ roles: MEDIA_WRITE }),
    delete: tenantRoleOrPlatform({ roles: MEDIA_WRITE }),
  },
  upload: {
    // Local development only; the S3/R2 adapter takes over when S3_BUCKET is set
    staticDir: path.resolve(process.cwd(), 'media'),
    mimeTypes: [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES],
    resizeOptions: { width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      {
        name: 'thumb',
        width: 200,
        height: 200,
        fit: 'inside',
        formatOptions: { format: 'webp', options: { quality: 75 } },
      },
      {
        name: 'card',
        width: 600,
        height: 600,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'detail',
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
      // No separate zoom size: the stored original (WebP, at most 2000 px) is the zoom image
    ],
    adminThumbnail: 'thumb',
    focalPoint: true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Alt text',
      type: 'text',
      admin: {
        description:
          'Describe the photo for people using screen readers and for search engines, for example “Aria basin mixer in matt black, side view”.',
      },
      validate: (value: string | null | undefined, { data }: { data: { mimeType?: string } }) =>
        isImage(data?.mimeType) && !value?.trim() ? 'Alt text is required for images' : true,
    },
    { name: 'caption', type: 'text' },
    storeFolderField,
  ],
  hooks: {
    beforeOperation: [
      async ({ args, operation, req }) => {
        if (operation !== 'create' && operation !== 'update') return args
        const file = req.file
        if (!file) return args
        const limit = isImage(file.mimetype) ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES
        if (file.size > limit) {
          throw new APIError(
            `${isImage(file.mimetype) ? 'Images' : 'PDFs'} can be up to ${limit / MB} MB; this file is ${(file.size / MB).toFixed(1)} MB.`,
            413,
            undefined,
            true,
          )
        }
        return args
      },
    ],
    beforeChange: [
      // The store is known here (the tenant field's default has been applied)
      async ({ data, req }) => {
        const tenantId = idOf(data.tenant)
        if (req.file && tenantId) await assertStorageAvailable(req, tenantId, req.file.size)
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        const tenantId = idOf(doc.tenant)
        if (!tenantId) return
        const before = operation === 'create' ? 0 : storedBytes(previousDoc)
        await adjustStorageUsage(req, tenantId, storedBytes(doc) - before)
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const tenantId = idOf(doc.tenant)
        if (tenantId) await adjustStorageUsage(req, tenantId, -storedBytes(doc))
      },
    ],
  },
}
