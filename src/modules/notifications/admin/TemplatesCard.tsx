import type { Payload } from 'payload'

import { Card, Pill, type Tone } from '@/admin/ui'

import { isMarketingKey, MARKETING_KEYS, MARKETING_TEMPLATES } from '../marketing'
import { MILESTONE_KEYS, milestoneOf, TEMPLATE_STATUSES } from '../milestones'
import { storeTemplates } from '../services/templates'
import { TemplateActions } from './TemplateActions'

const TONE: Record<string, Tone> = {
  approved: 'success',
  submitted: 'warning',
  rejected: 'danger',
  paused: 'danger',
  disabled: 'neutral',
  draft: 'neutral',
}

/**
 * The store's WhatsApp templates and Meta's verdict on each (docs/18 "Templates"). Every step
 * goes out on WhatsApp only once its template is approved; until then that shopper gets email.
 */
export async function TemplatesCard({
  payload,
  storeId,
  canEdit,
  connected,
}: {
  payload: Payload
  storeId: string
  canEdit: boolean
  connected: boolean
}) {
  const order = (t: { milestone: string; variant?: string | null }) =>
    isMarketingKey(t.milestone)
      ? 1000 + MARKETING_KEYS.indexOf(t.milestone)
      : MILESTONE_KEYS.indexOf(t.milestone as never) * 10 + (t.variant === 'cod' ? 1 : 0)
  const templates = (await storeTemplates(payload, storeId)).sort((a, b) => order(a) - order(b))
  const label = (value: string) => TEMPLATE_STATUSES.find((s) => s.value === value)?.label ?? value
  const approved = templates.filter((t) => t.status === 'approved').length
  return (
    <Card
      actions={
        <Pill tone={approved === templates.length && approved > 0 ? 'success' : 'neutral'}>
          {approved} of {templates.length} approved
        </Pill>
      }
      title="Message templates"
    >
      {templates.length === 0 ? (
        <p className="te-muted">Open Order updates once to create the starter templates.</p>
      ) : (
        <div className="te-messages te-messages--compact">
          {templates.map((t) => (
            <div className="te-messages__row" key={t.id}>
              <div className="te-messages__what">
                <span className="te-strong">
                  {isMarketingKey(t.milestone)
                    ? `${MARKETING_TEMPLATES[t.milestone].label} (marketing)`
                    : milestoneOf(t.milestone).label}
                  {t.variant && t.variant !== 'default'
                    ? ` (${t.variant === 'cod' ? 'COD' : 'prepaid'})`
                    : ''}
                </span>
                <span className="te-muted te-small te-mono">{t.whatsapp?.name}</span>
              </div>
              <Pill tone={TONE[t.status ?? 'draft'] ?? 'neutral'}>
                {label(t.status ?? 'draft')}
              </Pill>
              {t.rejectionReason ? <p className="te-messages__reply">{t.rejectionReason}</p> : null}
            </div>
          ))}
        </div>
      )}
      {canEdit ? (
        <TemplateActions
          canSubmit={templates.some((t) => ['draft', 'rejected'].includes(t.status ?? 'draft'))}
          connected={connected}
          storeId={storeId}
        />
      ) : null}
      <p className="te-muted te-small">
        {connected
          ? 'Meta usually approves within a day. Each step goes out on WhatsApp once its template is approved; until then it goes by email.'
          : 'Connect WhatsApp to submit these to Meta.'}
      </p>
    </Card>
  )
}
