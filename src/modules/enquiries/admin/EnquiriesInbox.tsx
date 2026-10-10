import type { ListViewServerProps, Where } from 'payload'

import { ENQUIRY_WORK, idOf, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, Card, EmptyState, PageHeader, Pill } from '@/admin/ui'
import { Icon } from '@/admin/ui/icons'
import { ListToolbar } from '@/admin/ui/ListToolbar'
import { formatDateAndTime, formatRelative } from '@/lib/dates'

import { ENQUIRY_STATUSES, ENQUIRY_TABS, ENQUIRY_TYPES } from '../constants'
import { mailtoLink, replyText, whatsappLink } from '../services/reply'
import { EnquiryPanel } from './EnquiryPanel'

const TAB_KEYS = ['new', 'in-progress', 'closed'] as const
const TYPE_LABEL = new Map<string, string>(ENQUIRY_TYPES.map((t) => [t.value, t.label]))

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

/** Older links (the dashboard, the bell) filter by status or assignee in Payload's format */
function tabFrom(searchParams: Record<string, unknown> | undefined): string {
  const tab = param(searchParams?.tab)
  if (tab) return tab
  const status = param(searchParams?.['where[status][equals]'])
  if (status === 'new') return 'new'
  if (status === 'contacted' || status === 'quoted') return 'in-progress'
  if (status === 'won' || status === 'lost') return 'closed'
  return 'new'
}

/**
 * Enquiries inbox (docs/screens/vendor-cms.md `cms-enquiries`): every question, quote request
 * and dealership enquiry, the open one beside the list with its product, reply buttons,
 * assignment, status and team notes. Replaces Payload's list.
 */
export async function EnquiriesInbox({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its enquiries.
        </EmptyState>
      </div>
    )
  }
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : storeRolesOf(user, store.id).some((role) => ENQUIRY_WORK.includes(role))
  const tab = tabFrom(searchParams)
  const type = param(searchParams?.type)
  const q = param(searchParams?.q).trim()
  const assigned =
    param(searchParams?.['where[assignedTo][equals]']) || param(searchParams?.assigned)
  const openId = param(searchParams?.open)

  const scope: Where[] = [
    { tenant: { equals: store.id } },
    ...(type ? [{ type: { equals: type } }] : []),
    ...(assigned ? [{ assignedTo: { equals: assigned } }] : []),
    ...(q
      ? [
          {
            or: [
              { referenceNumber: { like: q } },
              { name: { like: q } },
              { company: { like: q } },
              { phone: { like: q } },
              { email: { like: q } },
              { productTitle: { like: q } },
            ],
          },
        ]
      : []),
  ]
  const statusesOf = (key: string) =>
    ENQUIRY_TABS[TAB_KEYS.indexOf(key as (typeof TAB_KEYS)[number])]?.statuses ?? ['new']

  const [counts, list, staff] = await Promise.all([
    Promise.all(
      TAB_KEYS.map(async (key) => {
        const { totalDocs } = await payload.count({
          collection: 'enquiries',
          where: { and: [...scope, { status: { in: [...statusesOf(key)] } }] },
          overrideAccess: true,
        })
        return [key, totalDocs] as const
      }),
    ).then((rows) => Object.fromEntries(rows) as Record<string, number>),
    payload.find({
      collection: 'enquiries',
      where: { and: [...scope, { status: { in: [...statusesOf(tab)] } }] },
      sort: '-createdAt',
      depth: 0,
      limit: 50,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'users',
      where: { 'tenants.tenant': { equals: store.id } },
      sort: 'name',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true },
    }),
  ])

  const open =
    (openId ? list.docs.find((doc) => String(doc.id) === openId) : null) ??
    (openId
      ? await payload
          .findByID({ collection: 'enquiries', id: openId, depth: 0, overrideAccess: true })
          .then((doc) => (idOf(doc.tenant) === store.id ? doc : null))
          .catch(() => null)
      : list.docs[0]) ??
    null

  const [product, settings] = open
    ? await Promise.all([
        open.modelNumber
          ? payload
              .find({
                collection: 'products',
                where: {
                  and: [
                    { tenant: { equals: store.id } },
                    { modelNumber: { equals: open.modelNumber } },
                  ],
                },
                depth: 1,
                limit: 1,
                overrideAccess: true,
                select: { title: true, gallery: true, purchaseMode: true },
              })
              .then((r) => r.docs[0] ?? null)
          : null,
        payload
          .find({
            collection: 'site-settings',
            where: { tenant: { equals: store.id } },
            depth: 0,
            limit: 1,
            overrideAccess: true,
            select: { storeName: true },
          })
          .then((r) => r.docs[0] ?? null),
      ])
    : [null, null]

  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams()
    const current: Record<string, string> = { tab, type, q, open: openId }
    for (const [key, value] of Object.entries({ ...current, ...changes })) {
      if (value) next.set(key, value)
    }
    const query = next.toString()
    return query ? `${adminUrl.collection('enquiries')}?${query}` : adminUrl.collection('enquiries')
  }

  const text = open ? replyText({ ...open, storeName: settings?.storeName }) : null
  const email = open && text ? mailtoLink(open.email, text.subject, text.body) : null
  const whatsapp = open && text ? whatsappLink(open.phone, text.body.trim()) : null
  const photo = product?.gallery?.[0]
  const photoUrl =
    photo && typeof photo === 'object' ? (photo.sizes?.thumb?.url ?? photo.url ?? null) : null
  const staffName = new Map(staff.docs.map((s) => [String(s.id), s.name]))

  return (
    <div className="te-page">
      <PageHeader
        actions={
          canWrite ? (
            <ButtonLink href={adminUrl.create('enquiries')} icon="phone">
              Log an enquiry
            </ButtonLink>
          ) : null
        }
        eyebrow={store.name}
        subtitle="Questions, quote requests and dealership enquiries from the store"
        title="Enquiries"
      />
      <div className="te-grid te-grid--1-2">
        <div className="te-stack">
          <nav aria-label="Enquiry status" className="te-tabs te-tabs--underline">
            {TAB_KEYS.map((key, index) => (
              <a
                aria-current={tab === key ? 'page' : undefined}
                className={`te-tab${tab === key ? ' te-tab--active' : ''}`}
                href={hrefWith({ tab: key, open: null })}
                key={key}
              >
                {ENQUIRY_TABS[index]!.label} <span className="te-tab__count">{counts[key]}</span>
              </a>
            ))}
          </nav>
          <ListToolbar
            filters={[
              {
                key: 'type',
                label: 'Type',
                anyLabel: 'Type: all',
                options: ENQUIRY_TYPES.map(({ value, label }) => ({ value, label })),
              },
            ]}
            initial={{ q, type }}
            searchLabel="Search enquiries"
            searchPlaceholder="Name, phone, product or ENQ number"
          />
          {list.docs.length ? (
            <ul className="te-inbox">
              {list.docs.map((enquiry) => {
                const about = enquiry.productTitle
                  ? `${enquiry.qty ? `${enquiry.qty} × ` : ''}${enquiry.productTitle}`
                  : (enquiry.message ?? '')
                return (
                  <li key={enquiry.id}>
                    <a
                      aria-current={
                        open && String(open.id) === String(enquiry.id) ? 'true' : undefined
                      }
                      className={`te-inbox__item${open && String(open.id) === String(enquiry.id) ? ' te-inbox__item--open' : ''}`}
                      href={hrefWith({ open: String(enquiry.id) })}
                    >
                      <span className="te-inbox__top">
                        <b>{TYPE_LABEL.get(enquiry.type) ?? enquiry.type}</b>
                        <span className="te-muted te-small">
                          {formatRelative(enquiry.createdAt)}
                        </span>
                      </span>
                      <span className="te-small">
                        {[enquiry.company || enquiry.name, enquiry.city].filter(Boolean).join(', ')}
                      </span>
                      {about ? <span className="te-muted te-small te-clamp">{about}</span> : null}
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState icon="enquiries" title="Nothing here">
              {q || type ? 'No enquiries match the search.' : 'No enquiries in this tab.'}
            </EmptyState>
          )}
        </div>

        {open ? (
          <Card
            actions={<span className="te-mono te-small te-muted">{open.referenceNumber}</span>}
            title={`${TYPE_LABEL.get(open.type) ?? open.type} · ${open.company || open.name}`}
          >
            <dl className="te-dl te-dl--grid">
              {(
                [
                  ['Name', open.name],
                  ['Company', open.company],
                  ['Phone', open.phone],
                  ['Email', open.email],
                  ['City', [open.city, open.pincode].filter(Boolean).join(' ')],
                  ['Received', formatDateAndTime(open.createdAt)],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || <span className="te-muted">—</span>}</dd>
                </div>
              ))}
            </dl>
            {open.productTitle ? (
              <a
                className="te-notice te-notice--info te-enquiry-product"
                href={product ? adminUrl.doc('products', product.id) : undefined}
              >
                <span
                  aria-hidden
                  className="te-product-cell__thumb"
                  style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
                />
                <span>
                  <b className="te-small">{open.productTitle}</b>
                  <span className="te-block te-mono te-small te-muted">
                    {open.modelNumber}
                    {product?.purchaseMode === 'enquire' ? ' · Request a quote product' : ''}
                  </span>
                </span>
                {open.qty ? <b>Qty {open.qty}</b> : null}
              </a>
            ) : null}
            {open.message ? (
              <blockquote className="te-quote-text">“{open.message}”</blockquote>
            ) : null}
            <p className="te-muted te-small">
              <Icon name="documents" size={13} /> Attachments come with private file storage.
            </p>
            <div className="te-button-row">
              {email ? (
                <a className="te-button te-button--secondary te-button--small" href={email}>
                  <Icon name="mail" size={15} /> Reply by email
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  className="te-button te-button--secondary te-button--small"
                  href={whatsapp}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon name="whatsapp" size={15} /> Reply on WhatsApp
                </a>
              ) : null}
              <span
                aria-disabled
                className="te-button te-button--ghost te-button--small"
                title="Formal quotes with prices and validity come with the Phase 2 dealer portal"
              >
                Create formal quote <Pill tone="neutral">P2</Pill>
              </span>
            </div>
            <EnquiryPanel
              assignedTo={idOf(open.assignedTo) ?? ''}
              canWrite={canWrite}
              id={String(open.id)}
              notes={(open.internalNotes ?? []).map((n) => ({
                id: n.id ?? null,
                text: n.text,
                by: idOf(n.by),
                at: n.at ?? null,
              }))}
              staff={staff.docs.map((s) => ({ value: String(s.id), label: s.name }))}
              status={open.status}
              statuses={ENQUIRY_STATUSES.map(({ value, label }) => ({ value, label }))}
            />
            {(open.internalNotes ?? []).length ? (
              <ol className="te-activity">
                {[...(open.internalNotes ?? [])].reverse().map((n, index) => (
                  <li key={n.id ?? index}>
                    <span className="te-activity__item">
                      <span className="te-activity__text">
                        <span className="te-activity__primary">{n.text}</span>
                        <span className="te-activity__secondary">
                          {n.at ? formatRelative(n.at) : ''}
                          {idOf(n.by) ? ` · ${staffName.get(idOf(n.by)!) ?? 'Team'}` : ''}
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            <a className="te-link te-small" href={adminUrl.doc('enquiries', open.id)}>
              Open the full record
            </a>
          </Card>
        ) : (
          <Card>
            <EmptyState icon="enquiries" title="No enquiry open">
              Pick one from the list. Store forms land here: product questions, quote requests,
              dealership enquiries and the contact form.
            </EmptyState>
          </Card>
        )}
      </div>
    </div>
  )
}
