import type { AdminViewServerProps } from 'payload'

import { CATALOG_WRITE, STORE_ADMIN, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { requireSignedIn } from '@/admin/session/requireSignedIn'
import { currentStore, storeRolesOf } from '@/admin/store'
import { AdminScreen } from '@/admin/ui/AdminScreen'
import { Notice, PageHeader } from '@/admin/ui'

import { IMPORT_KINDS, IMPORT_STATUSES, type ImportKind } from '../constants'
import type { RowError } from '../services/cells'
import { ImportClient, type JobView } from './ImportClient'

/** CSV import (docs/screens/vendor-cms.md `cms-import`): check first, then import. */
export async function ImportView(view: AdminViewServerProps) {
  return (
    <AdminScreen view={view}>
      <Import view={view} />
    </AdminScreen>
  )
}

const when = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      })
    : ''

async function Import({ view }: { view: AdminViewServerProps }) {
  const { req } = view.initPageResult
  requireSignedIn(req.user, adminUrl.import)
  const store = await currentStore(req.payload, req.user)
  if (!store) {
    return (
      <div className="te-page">
        <Notice tone="info">Open a store to import into it.</Notice>
      </div>
    )
  }
  const roles = storeRolesOf(req.user, store.id)
  const session = storeSessionOf(req.user)
  const catalog = session ? session.mode === 'manage' : roles.some((r) => CATALOG_WRITE.includes(r))
  const admin = session ? session.mode === 'manage' : roles.some((r) => STORE_ADMIN.includes(r))
  if (!catalog) {
    return (
      <div className="te-page">
        <Notice tone="danger">Owners, managers and catalog editors import products.</Notice>
      </div>
    )
  }
  const kinds = IMPORT_KINDS.filter(
    (k) => k.value !== 'dealers' || (admin && store.features.includes('dealer-locator')),
  ).map((k) => ({ value: k.value as ImportKind, label: k.label }))

  const { docs: recent } = await req.payload.find({
    collection: 'import-jobs',
    where: { tenant: { equals: store.id } },
    sort: '-createdAt',
    depth: 0,
    limit: 10,
    overrideAccess: true,
    select: { csv: false },
  })
  const asked = typeof view.searchParams?.job === 'string' ? view.searchParams.job : null
  const current = asked ? recent.find((j) => String(j.id) === asked) : null
  const label = (value: string, list: readonly { value: string; label: string }[]) =>
    list.find((x) => x.value === value)?.label ?? value

  const toView = (j: (typeof recent)[number]): JobView => {
    const stats = (j.stats ?? {}) as {
      rows?: number
      create?: number
      update?: number
      errorRows?: number
    }
    const result = (j.result ?? null) as {
      created: number
      updated: number
      skipped: number
    } | null
    return {
      id: String(j.id),
      kind: j.kind,
      kindLabel: label(j.kind, IMPORT_KINDS),
      filename: j.filename,
      status: j.status,
      statusLabel: label(j.status, IMPORT_STATUSES),
      by: j.uploadedByName ?? '',
      at: when(j.createdAt),
      rows: stats.rows ?? 0,
      create: stats.create ?? 0,
      update: stats.update ?? 0,
      errorRows: stats.errorRows ?? 0,
      errors: ((j.errors as RowError[] | null) ?? []).slice(0, 50),
      errorCount: ((j.errors as RowError[] | null) ?? []).length,
      result,
    }
  }

  return (
    <div className="te-page">
      <PageHeader
        eyebrow={store.name}
        subtitle={
          current
            ? `${current.filename} · uploaded by ${current.uploadedByName ?? 'staff'} at ${when(current.createdAt)}`
            : 'Bring in or update many products from a spreadsheet, with a full check before anything changes.'
        }
        title="Import products"
      />
      <ImportClient
        current={current ? toView(current) : null}
        kinds={kinds}
        recent={recent.map(toView)}
        storeId={store.id}
      />
    </div>
  )
}
