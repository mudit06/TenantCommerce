'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

import { callApi } from '@/admin/client/api'
import { formatINR } from '@/lib/money'

type Preview = {
  card: {
    title: string
    modelNumber: string | null
    priceMinor: number
    mrpMinor: number | null
    badge: string | null
    until: string
  } | null
  cart: {
    lines: { title: string; amountMinor: number }[]
    discountMinor: number
    totalMinor: number
    freeShipping: boolean
  } | null
}

type Version = {
  id: string
  updatedAt: string
  version: Record<string, unknown> & { lastEditedBy?: string }
}

const AREAS: [string, string][] = [
  ['offer', 'the offer'],
  ['appliesTo', 'what it covers'],
  ['startsAt', 'the dates'],
  ['endsAt', 'the dates'],
  ['rules', 'the rules'],
  ['display', 'how the store shows it'],
  ['messages', 'who hears about it'],
  ['status', 'the status'],
  ['name', 'the name'],
]

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  })

/**
 * The editor's right column under Status (docs/screens Scheme editor): Preview from the same
 * engine as checkout, Results, and History from the saved versions.
 */
export function SchemeSidebar() {
  const { id, lastUpdateTime } = useDocumentInfo()
  const tenant = useFormFields(([fields]) => fields.tenant?.value) as unknown
  const stats = {
    orders: useFormFields(([f]) => f['stats.orders']?.value) as number | undefined,
    sales: useFormFields(([f]) => f['stats.salesMinor']?.value) as number | undefined,
    discount: useFormFields(([f]) => f['stats.discountMinor']?.value) as number | undefined,
  }
  const status = useFormFields(([f]) => f.status?.value) as string | undefined
  const storeId =
    typeof tenant === 'object' && tenant !== null
      ? String((tenant as { id: string }).id)
      : String(tenant ?? '')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    if (!id || !storeId) return
    let gone = false
    void callApi<Preview>(`/admin/v1/schemes/${id}/preview?store=${storeId}`, {
      method: 'GET',
    }).then((result) => {
      if (!gone && result.ok) setPreview(result.data)
    })
    void fetch(
      `/api/schemes/versions?where[parent][equals]=${id}&sort=-updatedAt&limit=20&depth=0`,
      {
        credentials: 'include',
      },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { docs?: Version[] } | null) => {
        if (gone || !json?.docs) return
        const docs = json.docs
        setHistory(
          docs.map((doc, i) => {
            const older = docs[i + 1]?.version
            const who = doc.version.lastEditedBy || 'Someone'
            if (!older) return `${when(doc.updatedAt)} · ${who} created it`
            const changed = [
              ...new Set(
                AREAS.filter(
                  ([key]) => JSON.stringify(doc.version[key]) !== JSON.stringify(older[key]),
                ).map(([, label]) => label),
              ),
            ]
            return `${when(doc.updatedAt)} · ${who} changed ${changed.length ? changed.join(', ') : 'it'}`
          }),
        )
      })
    return () => {
      gone = true
    }
  }, [id, storeId, lastUpdateTime])

  if (!id) return null
  const started = status === 'live' || status === 'ended' || status === 'paused'
  return (
    <>
      <div className="te-side-card">
        <p className="te-side-card__title">Preview</p>
        {preview?.card ? (
          <div className="te-preview-card">
            {preview.card.badge ? (
              <span className="te-preview-card__badge">{preview.card.badge}</span>
            ) : null}
            {preview.card.modelNumber ? (
              <span className="te-muted te-small">{preview.card.modelNumber}</span>
            ) : null}
            <span className="te-strong">{preview.card.title}</span>
            <span>
              <b>{formatINR(preview.card.priceMinor)}</b>{' '}
              {preview.card.mrpMinor && preview.card.mrpMinor > preview.card.priceMinor ? (
                <>
                  <s className="te-muted">{formatINR(preview.card.mrpMinor)}</s>{' '}
                  <span className="te-success-text">
                    {Math.round(
                      ((preview.card.mrpMinor - preview.card.priceMinor) / preview.card.mrpMinor) *
                        100,
                    )}
                    % off
                  </span>
                </>
              ) : null}
            </span>
            {preview.card.badge ? (
              <span className="te-small">
                {preview.card.badge} · until {preview.card.until}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="te-muted te-small">No product with a price is covered yet.</p>
        )}
        {preview?.cart ? (
          <dl className="te-dl">
            {preview.cart.lines.map((line) => (
              <div key={line.title}>
                <dt>{line.title}</dt>
                <dd>{formatINR(line.amountMinor, { decimals: 'always' })}</dd>
              </div>
            ))}
            {preview.cart.discountMinor ? (
              <div>
                <dt>Scheme discount</dt>
                <dd>−{formatINR(preview.cart.discountMinor, { decimals: 'always' })}</dd>
              </div>
            ) : null}
            {preview.cart.freeShipping ? (
              <div>
                <dt>Delivery</dt>
                <dd>Free</dd>
              </div>
            ) : null}
            <div>
              <dt className="te-strong">Total</dt>
              <dd className="te-strong">
                {formatINR(preview.cart.totalMinor, { decimals: 'always' })}
              </dd>
            </div>
          </dl>
        ) : null}
        <p className="te-muted te-small">
          Worked out by the same engine as checkout, as if it were live now. GST is on the
          discounted price. Save to refresh.
        </p>
      </div>
      <div className="te-side-card">
        <p className="te-side-card__title">Results</p>
        {started ? (
          <dl className="te-dl">
            <div>
              <dt>Orders</dt>
              <dd>{stats.orders ?? 0}</dd>
            </div>
            <div>
              <dt>Sales</dt>
              <dd>{formatINR(stats.sales ?? 0)}</dd>
            </div>
            <div>
              <dt>Discount given</dt>
              <dd>{formatINR(stats.discount ?? 0)}</dd>
            </div>
          </dl>
        ) : (
          <p className="te-muted te-small">
            Orders, sales and discount given appear once it starts.
          </p>
        )}
      </div>
      <div className="te-side-card">
        <p className="te-side-card__title">History</p>
        {history.length ? (
          <ul className="te-history">
            {history.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="te-muted te-small">Changes appear here after the first save.</p>
        )}
      </div>
    </>
  )
}
