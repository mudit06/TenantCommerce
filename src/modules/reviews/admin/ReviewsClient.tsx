'use client'

import { toast } from '@payloadcms/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, Empty, Pill } from '@/admin/ui'

export type ReviewSettings = {
  holdForApproval: boolean
  showOnProductPages: boolean
  allowPhotos: boolean
  requestAfterDays: number
  requestChannels: ('email' | 'whatsapp')[]
}

export type ReviewCard = {
  id: string
  rating: number
  title: string
  body: string
  meta: string
  photos: string[]
  status: string
  reason: string | null
  reply: string | null
  personal: boolean
}

const REASONS = [
  { value: 'abuse', label: 'Abuse' },
  { value: 'personal-data', label: 'Personal details' },
  { value: 'not-about-product', label: 'Not about the product' },
  { value: 'spam', label: 'Spam' },
  { value: 'duplicate', label: 'Duplicate' },
]

const Stars = ({ value }: { value: number }) => (
  <span aria-label={`${value} out of 5`} className="te-stars">
    {'★★★★★'.slice(0, value)}
    <span className="te-stars__off">{'★★★★★'.slice(value)}</span> {value.toFixed(1)}
  </span>
)

function ReviewItem({
  card,
  storeId,
  canModerate,
}: {
  card: ReviewCard
  storeId: string
  canModerate: boolean
}) {
  const router = useRouter()
  const [reply, setReply] = useState(card.reply ?? '')
  const [replying, setReplying] = useState(card.rating <= 2 && card.status === 'pending')
  const [reason, setReason] = useState(card.personal ? 'personal-data' : '')
  const [busy, setBusy] = useState(false)

  const act = async (body: Record<string, unknown>, done: string) => {
    setBusy(true)
    const result = await callApi(`/admin/v1/reviews/${card.id}?store=${storeId}`, { body })
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success(done)
    router.refresh()
  }

  return (
    <Card>
      <div className="te-stack">
        <div className="te-inline-actions">
          <Stars value={card.rating} />
          <b className="te-grow">{card.title || 'No title'}</b>
          <Pill tone="success">Verified purchase</Pill>
        </div>
        <span className="te-muted te-small">{card.meta}</span>
        {card.body ? <p className="te-review-body">{card.body}</p> : null}
        {card.photos.length ? (
          <div className="te-inline-actions">
            {card.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- media thumbnails
              <img alt="Shopper's photo" className="te-review-photo" key={url} src={url} />
            ))}
          </div>
        ) : null}
        {card.status === 'rejected' ? (
          <p className="te-muted te-small">Rejected: {card.reason ?? 'no reason kept'}</p>
        ) : null}
        {card.status === 'pending' && card.rating <= 2 ? (
          <div className="te-notice te-notice--info">
            Low ratings are published like any other. Reply to help the shopper.
          </div>
        ) : null}
        {card.reply && !replying ? (
          <p className="te-review-reply">
            <b>Your reply:</b> {card.reply}
          </p>
        ) : null}
        {canModerate && replying ? (
          <div>
            <label className="te-label" htmlFor={`reply-${card.id}`}>
              Public reply
            </label>
            <textarea
              className="te-input"
              id={`reply-${card.id}`}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              value={reply}
            />
            <p className="te-field-help">Shown under the review; the shopper gets an email.</p>
          </div>
        ) : null}
        {canModerate ? (
          <div className="te-inline-actions">
            {card.status !== 'published' ? (
              <button
                className="te-button te-button--primary te-button--small"
                disabled={busy}
                onClick={() =>
                  act(
                    { action: 'approve', ...(replying && reply.trim() ? { reply } : {}) },
                    'Published',
                  )
                }
                type="button"
              >
                {replying && reply.trim() ? 'Approve with reply' : 'Approve'}
              </button>
            ) : null}
            {card.status === 'published' && replying ? (
              <button
                className="te-button te-button--primary te-button--small"
                disabled={busy || reply.trim().length < 2}
                onClick={() => act({ action: 'reply', reply }, 'Reply published')}
                type="button"
              >
                Publish reply
              </button>
            ) : null}
            {!replying && card.status !== 'rejected' ? (
              <button
                className="te-button te-button--secondary te-button--small"
                onClick={() => setReplying(true)}
                type="button"
              >
                Reply
              </button>
            ) : null}
            {card.status !== 'rejected' ? (
              <>
                <select
                  aria-label="Reason to reject"
                  className="te-input te-input--inline"
                  onChange={(e) => setReason(e.target.value)}
                  value={reason}
                >
                  <option value="">Reason…</option>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      Reason: {r.label.toLowerCase()}
                    </option>
                  ))}
                </select>
                <button
                  className="te-button te-button--danger te-button--small"
                  disabled={busy || !reason}
                  onClick={() => act({ action: 'reject', reason }, 'Rejected')}
                  title={reason ? undefined : 'Pick a reason first'}
                  type="button"
                >
                  Reject
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export function ReviewsClient({
  cards,
  counts,
  filters,
  products,
  settings,
  month,
  storeId,
  canModerate,
  canSettings,
}: {
  cards: ReviewCard[]
  counts: { pending: number; published: number; rejected: number }
  filters: { tab: string; rating: string; product: string; photos: boolean }
  products: { value: string; label: string }[]
  settings: ReviewSettings
  month: { requests: number; received: number; approved: number; rejected: number; average: string }
  storeId: string
  canModerate: boolean
  canSettings: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [values, setValues] = useState(settings)
  const [saving, setSaving] = useState(false)

  const go = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    router.replace(`${pathname}?${next}`, { scroll: false })
  }

  const saveSettings = async () => {
    setSaving(true)
    const result = await callApi(`/admin/v1/reviews/settings?store=${storeId}`, { body: values })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    toast.success('Settings saved')
    router.refresh()
  }

  const toggle = (key: 'holdForApproval' | 'showOnProductPages' | 'allowPhotos', label: string) => (
    <label className="te-checkbox">
      <input
        checked={values[key]}
        disabled={!canSettings}
        onChange={(e) => setValues({ ...values, [key]: e.target.checked })}
        type="checkbox"
      />
      {label}
    </label>
  )

  return (
    <div className="te-coupon-layout">
      <div className="te-stack">
        <nav aria-label="Review status" className="te-tabs te-tabs--underline">
          {(
            [
              ['pending', 'To approve'],
              ['published', 'Published'],
              ['rejected', 'Rejected'],
            ] as const
          ).map(([key, label]) => (
            <button
              aria-current={filters.tab === key ? 'page' : undefined}
              className={`te-tab${filters.tab === key ? ' te-tab--active' : ''}`}
              key={key}
              onClick={() => go({ tab: key })}
              type="button"
            >
              {label} <span className="te-tab__count">{counts[key]}</span>
            </button>
          ))}
        </nav>
        <div className="te-toolbar-row">
          <label className="te-filter">
            <span className="te-filter__label">Rating</span>
            <select onChange={(e) => go({ rating: e.target.value })} value={filters.rating}>
              <option value="">Rating: all</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </label>
          <label className="te-filter">
            <span className="te-filter__label">Product</span>
            <select onChange={(e) => go({ product: e.target.value })} value={filters.product}>
              <option value="">Product: all</option>
              {products.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="te-checkbox">
            <input
              checked={filters.photos}
              onChange={(e) => go({ photos: e.target.checked ? '1' : '' })}
              type="checkbox"
            />
            With photos
          </label>
        </div>
        {cards.length ? (
          cards.map((card) => (
            <ReviewItem canModerate={canModerate} card={card} key={card.id} storeId={storeId} />
          ))
        ) : (
          <Empty>
            {filters.tab === 'pending'
              ? 'Nothing to approve. New reviews from buyers arrive here.'
              : 'No reviews here.'}
          </Empty>
        )}
      </div>
      <div className="te-stack">
        <Card title="Settings">
          <div className="te-stack">
            {toggle('holdForApproval', 'Hold new reviews for approval')}
            {toggle('showOnProductPages', 'Show reviews on product pages')}
            {toggle('allowPhotos', 'Allow photos (up to 4)')}
            <div>
              <label className="te-label" htmlFor="review-days">
                Ask for a review, days after delivery
              </label>
              <input
                className="te-input"
                disabled={!canSettings}
                id="review-days"
                inputMode="numeric"
                max={60}
                min={1}
                onChange={(e) =>
                  setValues({ ...values, requestAfterDays: Number(e.target.value) || 1 })
                }
                type="number"
                value={values.requestAfterDays}
              />
            </div>
            <label className="te-checkbox">
              <input checked disabled type="checkbox" />
              By email
            </label>
            <p className="te-muted te-small">
              WhatsApp review requests need WhatsApp offers from the platform team and the shopper’s
              offer consent; they come with WhatsApp offers.
            </p>
            {canSettings ? (
              <div>
                <button
                  className="te-button te-button--primary te-button--small"
                  disabled={saving}
                  onClick={saveSettings}
                  type="button"
                >
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            ) : null}
          </div>
        </Card>
        <Card title="This month">
          <dl className="te-dl">
            <dt>Requests sent</dt>
            <dd>{month.requests}</dd>
            <dt>Reviews received</dt>
            <dd>
              {month.received}
              {month.requests ? ` (${Math.round((month.received / month.requests) * 100)}%)` : ''}
            </dd>
            <dt>Approved / rejected</dt>
            <dd>
              {month.approved} / {month.rejected}
            </dd>
            <dt>Average rating</dt>
            <dd>{month.average}</dd>
          </dl>
          <p className="te-muted te-small">
            Rejected reviews keep their reason · staff never edit a review
          </p>
        </Card>
      </div>
    </div>
  )
}
