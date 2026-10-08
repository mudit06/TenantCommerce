import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

import {
  CATALOG_WRITE,
  hasTenantRole,
  STORE_ADMIN,
  storeSessionOf,
  type TenantRole,
} from '@/access'
import { csvFile, parseCsv } from '@/lib/csv'
import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { requireFeature } from '@/modules/tenancy'
import type { ImportJob, User } from '@/payload-types'

import { MAX_BYTES, MAX_ERRORS, MAX_ROWS, type ImportKind } from '../constants'
import { toRows, type Row, type RowError } from './cells'
import { applyProductPlan, loadSnapshot, planProducts, type ProductPlan } from './products'
import { applySimplePlan, planDealers, planStock, type SimplePlan } from './simple'

// The import flow (docs/12, docs/screens CSV import): upload → check (nothing changes) → the
// vendor confirms → a background job imports the ready rows → an email when it finishes.

const ROLES: Record<ImportKind, readonly TenantRole[]> = {
  products: CATALOG_WRITE,
  stock: CATALOG_WRITE,
  dealers: STORE_ADMIN,
}

export async function assertImportAccess(req: PayloadRequest, tenantId: string, kind: ImportKind) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || session.mode !== 'manage') {
      throw new AppError('FORBIDDEN', 'Open this store with “Manage store” to import', 403)
    }
  } else if (!hasTenantRole(req.user, tenantId, ROLES[kind])) {
    throw new AppError('FORBIDDEN', 'Your role can’t import this', 403)
  }
  if (kind === 'dealers') await requireFeature(req.payload, tenantId, 'dealer-locator')
}

type Planned =
  { kind: 'products'; plans: ProductPlan[] } | { kind: 'stock' | 'dealers'; plans: SimplePlan[] }

async function plan(
  payload: Payload,
  tenantId: string,
  kind: ImportKind,
  rows: Row[],
  req?: PayloadRequest,
) {
  if (kind === 'products') {
    const snapshot = await loadSnapshot(payload, tenantId, req)
    const result = planProducts(snapshot, rows)
    return { ...result, planned: { kind, plans: result.plans } as Planned, snapshot }
  }
  const result =
    kind === 'stock'
      ? await planStock(payload, tenantId, rows, req)
      : await planDealers(payload, tenantId, rows, req)
  return { ...result, planned: { kind, plans: result.plans } as Planned, snapshot: null }
}

const statsOf = (r: { rows: number; create: number; update: number; errors: RowError[] }) => ({
  rows: r.rows,
  create: r.create,
  update: r.update,
  errorRows: new Set(r.errors.map((e) => e.row)).size,
})

/** Upload and check: parses the file, checks every row, changes nothing in the store. */
export async function checkImport(
  req: PayloadRequest,
  tenantId: string,
  input: { kind: ImportKind; filename: string; csv: string },
): Promise<ImportJob> {
  await assertImportAccess(req, tenantId, input.kind)
  if (input.csv.length > MAX_BYTES) {
    throw new AppError('VALIDATION_FAILED', 'Files up to 5 MB: split it into smaller files.', 400)
  }
  const table = parseCsv(input.csv)
  if (table.length < 2) throw new AppError('VALIDATION_FAILED', 'The file has no rows.', 400)
  if (table.length - 1 > MAX_ROWS) {
    throw new AppError(
      'VALIDATION_FAILED',
      `Up to ${MAX_ROWS.toLocaleString('en-IN')} rows a file: split it into smaller files.`,
      400,
    )
  }
  const { rows } = toRows(table)
  // Reads only, outside any transaction (the snapshot reads run side by side)
  const result = await plan(req.payload, tenantId, input.kind, rows)
  const user = req.user as User
  return req.payload.create({
    collection: 'import-jobs',
    data: {
      tenant: tenantId,
      kind: input.kind,
      filename: input.filename.slice(0, 120) || 'import.csv',
      status: 'checked',
      uploadedBy: String(user.id),
      uploadedByName: user.name ?? user.email,
      csv: input.csv,
      stats: statsOf(result),
      errors: result.errors.slice(0, MAX_ERRORS),
    },
    overrideAccess: true,
    req,
  })
}

async function ownJob(payload: Payload, tenantId: string, id: string, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'import-jobs',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: id } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!docs[0]) throw new AppError('NOT_FOUND', 'Import not found', 404)
  return docs[0]
}

/** "Import the ready rows": queues the background job. */
export async function startImport(req: PayloadRequest, tenantId: string, id: string) {
  const job = await ownJob(req.payload, tenantId, id, req)
  await assertImportAccess(req, tenantId, job.kind)
  if (job.status !== 'checked') {
    throw new AppError(
      'INVALID_TRANSITION',
      'This file has already been imported or cancelled',
      409,
    )
  }
  await req.payload.update({
    collection: 'import-jobs',
    id: job.id,
    data: { status: 'queued' },
    overrideAccess: true,
    req,
  })
  await req.payload.jobs.queue({ task: 'run-import', input: { importId: String(job.id) }, req })
}

export async function cancelImport(req: PayloadRequest, tenantId: string, id: string) {
  const job = await ownJob(req.payload, tenantId, id, req)
  await assertImportAccess(req, tenantId, job.kind)
  if (job.status !== 'checked') return job
  return req.payload.update({
    collection: 'import-jobs',
    id: job.id,
    data: { status: 'cancelled', csv: null },
    overrideAccess: true,
    req,
  })
}

/** The background job: checks the rows again against the store as it is now, then imports. */
export async function runImport(payload: Payload, importId: string) {
  const job = await payload.findByID({
    collection: 'import-jobs',
    id: importId,
    depth: 0,
    overrideAccess: true,
  })
  if (job.status !== 'queued') return { created: 0, updated: 0, skipped: 0 }
  const tenantId = String(typeof job.tenant === 'object' ? job.tenant?.id : job.tenant)
  await payload.update({
    collection: 'import-jobs',
    id: job.id,
    data: { status: 'running', startedAt: new Date().toISOString() },
    overrideAccess: true,
  })
  const user = job.uploadedBy
    ? await payload
        .findByID({ collection: 'users', id: job.uploadedBy, depth: 0 })
        .catch(() => null)
    : null
  const { rows } = toRows(parseCsv(job.csv ?? ''))
  const result = await plan(payload, tenantId, job.kind, rows)
  const errors = [...result.errors]
  let created = 0
  let updated = 0
  for (const item of result.planned.plans) {
    // Each product (or row) in its own transaction: one failure skips only itself
    const req = await createLocalReq(
      { user: user ? { ...user, collection: 'users' } : undefined },
      payload,
    )
    try {
      const done = await withTransaction(req, () =>
        result.planned.kind === 'products'
          ? applyProductPlan(req, tenantId, item as ProductPlan, result.snapshot!)
          : applySimplePlan(req, tenantId, item as SimplePlan),
      )
      created += done.created
      updated += done.updated
    } catch (error) {
      const data = (error as { data?: { errors?: { message?: string }[] } }).data
      const message =
        data?.errors
          ?.map((e) => e.message)
          .filter(Boolean)
          .join(' ') || (error instanceof Error ? error.message : 'Could not save this row.')
      errors.push({ row: item.line, column: '', message, value: '' })
    }
  }
  const skipped = new Set(errors.map((e) => e.row)).size
  const finished = await payload.update({
    collection: 'import-jobs',
    id: job.id,
    data: {
      status: 'done',
      finishedAt: new Date().toISOString(),
      result: { created, updated, skipped },
      errors: errors.slice(0, MAX_ERRORS),
      // The file isn't needed any more; the error report keeps what to fix
      csv: null,
    },
    overrideAccess: true,
  })
  if (user?.email) {
    await payload
      .sendEmail({
        to: user.email,
        subject: `Import finished: ${job.filename}`,
        text: [
          `${job.filename} has been imported.`,
          `Created: ${created}. Updated: ${updated}. Rows skipped: ${skipped}.`,
          skipped ? 'Open Catalog → Import and export to download the rows to fix.' : '',
          job.kind === 'products' && created
            ? 'New products are saved as drafts: add their photos, then make them active.'
            : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      })
      .catch(() => undefined)
  }
  return finished.result as { created: number; updated: number; skipped: number }
}

/** The rows to fix, as a CSV to correct and upload again (rule 3). */
export async function errorReport(payload: Payload, tenantId: string, id: string) {
  const job = await ownJob(payload, tenantId, id)
  const rows = [
    ['Row', 'Column', 'What to fix', 'Value'],
    ...((job.errors as RowError[] | null) ?? []).map((e) => [e.row, e.column, e.message, e.value]),
  ]
  return {
    filename: `errors-${job.filename.replace(/\.csv$/i, '')}.csv`,
    csv: csvFile(rows),
    kind: job.kind,
  }
}
