'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, Empty, Pill } from '@/admin/ui'
import { labelOf, SUBSCRIPTION_STATUS_TONE } from '@/admin/ui/tones'
import { formatDate } from '@/lib/dates'
import { formatINR, fromRupees, GST_ON_SUBSCRIPTION_PERCENT, toRupeesString } from '@/lib/money'

import { PAYMENT_METHODS } from '../../constants'
import type { BillingPanelData } from '../billingData'

const todayIso = () => new Date().toISOString().slice(0, 10)

/** docs/screens/super-admin.md "Vendor billing": subscription, history and manual payments. */
export function BillingPanel({ data, canEdit }: { data: BillingPanelData; canEdit: boolean }) {
  const router = useRouter()
  const { subscription: sub } = data
  const [amount, setAmount] = useState(toRupeesString(sub.nextDueMinor))
  const [paidOn, setPaidOn] = useState(todayIso())
  const [method, setMethod] = useState<string>('neft')
  const [reference, setReference] = useState('')
  const [planId, setPlanId] = useState(sub.planId)
  const [cycle, setCycle] = useState(sub.billingCycle)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const after = (ok: boolean, message: string) => {
    setBusy(false)
    if (ok) {
      toast.success(message)
      router.refresh()
    }
  }

  const recordPayment = async () => {
    setError(null)
    let amountMinor: number
    try {
      amountMinor = fromRupees(amount)
    } catch {
      setError('Type the amount in rupees, for example 11798.82')
      return
    }
    setBusy(true)
    const result = await callApi(`/admin/v1/platform/subscriptions/${sub.id}/payments`, {
      body: { amountMinor, paidOn, method, reference: reference || undefined },
    })
    if (!result.ok) setError(result.error.message)
    else setReference('')
    after(result.ok, 'Payment recorded')
  }

  const changePlan = async () => {
    setBusy(true)
    const result = await callApi(`/admin/v1/platform/subscriptions/${sub.id}/plan`, {
      body: { planId, billingCycle: cycle },
    })
    if (!result.ok) toast.error(result.error.message)
    after(result.ok, 'Plan changed')
  }

  const setStatus = async (action: 'pause' | 'resume' | 'cancel') => {
    setBusy(true)
    const result = await callApi(`/admin/v1/platform/subscriptions/${sub.id}/status`, {
      body: { action, reason: reason || undefined },
    })
    if (!result.ok) toast.error(result.error.message)
    else setReason('')
    after(
      result.ok,
      `Subscription ${action === 'resume' ? 'resumed' : action === 'pause' ? 'paused' : 'cancelled'}`,
    )
  }

  const planChanged = planId !== sub.planId || cycle !== sub.billingCycle

  return (
    <div className="te-grid te-grid--2-1">
      <div className="te-stack">
        <Card
          actions={<Pill tone={SUBSCRIPTION_STATUS_TONE[sub.status]}>{labelOf(sub.status)}</Pill>}
          title="Subscription"
        >
          <dl className="te-dl">
            <dt>Plan</dt>
            <dd>
              {sub.planName} · {formatINR(sub.priceMinor)} /{' '}
              {sub.billingCycle === 'yearly' ? 'year' : 'month'}
            </dd>
            <dt>With GST</dt>
            <dd>
              {formatINR(sub.priceMinor)} + {GST_ON_SUBSCRIPTION_PERCENT}% ={' '}
              <strong>{formatINR(sub.planDueMinor, { decimals: 'always' })}</strong>
            </dd>
            {sub.introLabel ? (
              <>
                <dt>Starting offer</dt>
                <dd>{sub.introLabel}</dd>
              </>
            ) : null}
            <dt>Billing</dt>
            <dd>
              {labelOf(sub.billingMode)} <Pill>Razorpay in P2</Pill>
            </dd>
            {sub.trialEndsLabel ? (
              <>
                <dt>Trial ends</dt>
                <dd>{sub.trialEndsLabel}</dd>
              </>
            ) : null}
            {sub.periodLabel ? (
              <>
                <dt>Current period</dt>
                <dd>{sub.periodLabel}</dd>
              </>
            ) : null}
            {sub.nextRenewalLabel ? (
              <>
                <dt>Next renewal</dt>
                <dd>{sub.nextRenewalLabel}</dd>
              </>
            ) : null}
          </dl>
        </Card>

        <Card title="History">
          {data.history.length === 0 ? (
            <Empty>No history yet.</Empty>
          ) : (
            <table className="te-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((row, index) => (
                  <tr key={`${row.at}-${index}`}>
                    <td>{formatDate(row.at)}</td>
                    <td>{row.event}</td>
                    <td>{row.amountMinor ? formatINR(row.amountMinor) : '—'}</td>
                    <td className="te-mono te-small">{row.reference ?? '—'}</td>
                    <td>{row.by ?? 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {canEdit ? (
        <div className="te-stack">
          <Card title="Record payment">
            <p className="te-muted te-small">
              {sub.nextIsIntro ? 'Starting offer: covers ' : 'Covers '}
              {sub.nextCoverLabel}. Bank transfers and UPI are recorded by hand in the MVP.
            </p>
            <div className="te-form">
              <label className="te-label" htmlFor="pay-amount">
                Amount (₹)
              </label>
              <input
                className="te-input"
                id="pay-amount"
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
                value={amount}
              />
              <label className="te-label" htmlFor="pay-date">
                Paid on
              </label>
              <input
                className="te-input"
                id="pay-date"
                max={todayIso()}
                onChange={(e) => setPaidOn(e.target.value)}
                type="date"
                value={paidOn}
              />
              <label className="te-label" htmlFor="pay-method">
                Method
              </label>
              <select
                className="te-input"
                id="pay-method"
                onChange={(e) => setMethod(e.target.value)}
                value={method}
              >
                {PAYMENT_METHODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="te-label" htmlFor="pay-ref">
                UTR or reference
              </label>
              <input
                className="te-input"
                id="pay-ref"
                onChange={(e) => setReference(e.target.value)}
                placeholder="For example SBIN0000000000"
                value={reference}
              />
              {error ? (
                <p className="te-text--danger te-small" role="alert">
                  {error}
                </p>
              ) : null}
              <Button disabled={busy} onClick={() => void recordPayment()}>
                Save payment
              </Button>
            </div>
          </Card>

          <Card title="Change plan">
            <div className="te-form">
              <label className="te-label" htmlFor="plan-select">
                Plan
              </label>
              <select
                className="te-input"
                id="plan-select"
                onChange={(e) => setPlanId(e.target.value)}
                value={planId}
              >
                {data.plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {formatINR(plan.priceMonthlyMinor)} / month
                  </option>
                ))}
              </select>
              <label className="te-label" htmlFor="cycle-select">
                Billing cycle
              </label>
              <select
                className="te-input"
                id="cycle-select"
                onChange={(e) => setCycle(e.target.value as 'monthly' | 'yearly')}
                value={cycle}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <p className="te-muted te-small">
                Features the new plan doesn’t allow are switched off; their data stays.
              </p>
              <Button disabled={busy || !planChanged} onClick={() => void changePlan()}>
                Change plan
              </Button>
            </div>
          </Card>

          <Card title="Pause or cancel">
            <div className="te-form">
              <label className="te-label" htmlFor="status-reason">
                Reason (optional, kept in the history)
              </label>
              <input
                className="te-input"
                id="status-reason"
                onChange={(e) => setReason(e.target.value)}
                value={reason}
              />
              <div className="te-button-row">
                {sub.status === 'paused' ? (
                  <Button disabled={busy} onClick={() => void setStatus('resume')} size="small">
                    Resume
                  </Button>
                ) : sub.status !== 'cancelled' ? (
                  <Button
                    buttonStyle="secondary"
                    disabled={busy}
                    onClick={() => void setStatus('pause')}
                    size="small"
                  >
                    Pause
                  </Button>
                ) : null}
                {sub.status !== 'cancelled' ? (
                  <Button
                    buttonStyle="error"
                    disabled={busy}
                    onClick={() => void setStatus('cancel')}
                    size="small"
                  >
                    Cancel subscription
                  </Button>
                ) : null}
              </div>
              <p className="te-muted te-small">
                Suspending the store stays a separate decision (Overview).
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
