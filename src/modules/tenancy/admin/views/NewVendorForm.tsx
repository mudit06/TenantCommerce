'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { callApi } from '@/admin/client/api'
import { adminUrl } from '@/admin/paths'
import { Card, Notice, Pill, Row, Rows } from '@/admin/ui'
import { parseGstin } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'
import { FEATURES, getFeature, isFeatureAvailable, type FeatureKey } from '@/modules/features'

import { INDUSTRIES, type Industry } from '../../constants'
import { startingFeatures } from '../../presets'

export type PlanOption = {
  id: string
  name: string
  priceMonthlyMinor: number
  maxProducts: number
  maxStaffUsers: number
  allowedModules: string[]
}

const slugFrom = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

type Errors = Record<string, string>

function FieldError({ errors, name }: { errors: Errors; name: string }) {
  return errors[name] ? <p className="te-field-error">{errors[name]}</p> : null
}

/** docs/screens/super-admin.md "New vendor": one form, five steps, same steps as the script. */
export function NewVendorForm({
  plans,
  platformDomain,
}: {
  plans: PlanOption[]
  platformDomain: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [gstin, setGstin] = useState('')
  const [line1, setLine1] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [industries, setIndustries] = useState<Industry[]>([])
  const [supportEmail, setSupportEmail] = useState('')
  const [supportPhone, setSupportPhone] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [planId, setPlanId] = useState(plans[0]?.id ?? '')
  const [trialDays, setTrialDays] = useState(14)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [overrides, setOverrides] = useState<Partial<Record<FeatureKey, boolean>>>({})
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [sendInvite, setSendInvite] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  const plan = plans.find((p) => p.id === planId)
  const effectiveSlug = slugEdited ? slug : slugFrom(name)
  const gst = gstin.trim() ? parseGstin(gstin) : null

  const preset = useMemo(
    () => startingFeatures(industries, plan?.allowedModules ?? []),
    [industries, plan],
  )
  const switches = useMemo(() => {
    const result = { ...preset }
    for (const [key, value] of Object.entries(overrides) as [FeatureKey, boolean][]) {
      result[key] = value && (plan?.allowedModules ?? []).includes(key) && isFeatureAvailable(key)
    }
    for (const feature of FEATURES) {
      if (result[feature.key] && feature.dependsOn?.some((dep) => !result[dep as FeatureKey])) {
        result[feature.key] = false
      }
    }
    return result
  }, [preset, overrides, plan])
  const onCount = Object.values(switches).filter(Boolean).length

  const toggleFeature = (key: FeatureKey, on: boolean) => {
    setOverrides((current) => {
      const next = { ...current, [key]: on }
      // Switching on pulls in what it needs; switching off drops what needs it
      if (on) for (const dep of getFeature(key).dependsOn ?? []) next[dep as FeatureKey] = true
      else for (const f of FEATURES) if (f.dependsOn?.includes(key)) next[f.key] = false
      return next
    })
  }

  const toggleIndustry = (value: Industry) =>
    setIndustries((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    )

  const submit = async () => {
    setBusy(true)
    setErrors({})
    const result = await callApi<{ id: string; inviteEmailed: boolean }>(
      '/admin/v1/platform/tenants',
      {
        body: {
          business: {
            name,
            legalName,
            gstin,
            registeredAddress: { line1, city, pincode },
            industry: industries,
            supportEmail,
            supportPhone,
          },
          store: { slug: effectiveSlug },
          plan: { planId, trialDays, billingCycle },
          features: overrides,
          owner: { name: ownerName, email: ownerEmail, phone: ownerPhone, sendInvite },
        },
      },
    )
    setBusy(false)
    if (!result.ok) {
      setErrors({ _: result.error.message, ...(result.error.fields ?? {}) })
      toast.error(result.error.message)
      return
    }
    toast.success(
      `${name} created as a draft store${result.data.inviteEmailed ? '. Invite emailed to the owner' : ''}`,
    )
    router.push(adminUrl.vendor(result.data.id))
  }

  const featureRows = FEATURES.filter((f) => f.group !== 'phase-2')

  return (
    <div className="te-grid te-grid--2-1">
      <div className="te-stack">
        <Card title="1 Business">
          <p className="te-muted te-small">Legal details used on GST invoices.</p>
          <div className="te-form-grid">
            <div>
              <label className="te-label" htmlFor="nv-name">
                Store name *
              </label>
              <input
                className="te-input"
                id="nv-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Brasskraft Fittings"
                value={name}
              />
              <FieldError errors={errors} name="business.name" />
            </div>
            <div>
              <label className="te-label" htmlFor="nv-legal">
                Legal name *
              </label>
              <input
                className="te-input"
                id="nv-legal"
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Brasskraft Industries Pvt Ltd"
                value={legalName}
              />
              <FieldError errors={errors} name="business.legalName" />
            </div>
            <div>
              <label className="te-label" htmlFor="nv-gstin">
                GSTIN *
              </label>
              <input
                className="te-input te-mono"
                id="nv-gstin"
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="24AAKCB1234F1Z5"
                value={gstin}
              />
              {gst && !gst.valid ? <p className="te-field-error">{gst.reason}</p> : null}
              <FieldError errors={errors} name="business.gstin" />
            </div>
            <div>
              <span className="te-label">PAN and state (from the GSTIN)</span>
              <p className="te-derived">
                {gst?.valid ? (
                  <>
                    <span className="te-mono">{gst.pan}</span> · {gst.stateName} ({gst.stateCode})
                  </>
                ) : (
                  <span className="te-muted">Fills in from a valid GSTIN</span>
                )}
              </p>
            </div>
            <div className="te-form-grid__wide">
              <label className="te-label" htmlFor="nv-addr">
                Registered address
              </label>
              <input
                className="te-input"
                id="nv-addr"
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Plot 41, GIDC Phase 2, Dared"
                value={line1}
              />
            </div>
            <div>
              <label className="te-label" htmlFor="nv-city">
                City
              </label>
              <input
                className="te-input"
                id="nv-city"
                onChange={(e) => setCity(e.target.value)}
                placeholder="Jamnagar"
                value={city}
              />
            </div>
            <div>
              <label className="te-label" htmlFor="nv-pin">
                Pincode
              </label>
              <input
                className="te-input"
                id="nv-pin"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="361004"
                value={pincode}
              />
              <FieldError errors={errors} name="business.registeredAddress.pincode" />
            </div>
            <fieldset className="te-fieldset te-form-grid__wide">
              <legend className="te-label">Industry *</legend>
              <div className="te-chips">
                {INDUSTRIES.map((industry) => (
                  <label className="te-chip" key={industry.value}>
                    <input
                      checked={industries.includes(industry.value)}
                      onChange={() => toggleIndustry(industry.value)}
                      type="checkbox"
                    />
                    {industry.label}
                  </label>
                ))}
              </div>
              <FieldError errors={errors} name="business.industry" />
            </fieldset>
            <div>
              <label className="te-label" htmlFor="nv-email">
                Support email
              </label>
              <input
                className="te-input"
                id="nv-email"
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="care@brasskraft.example"
                type="email"
                value={supportEmail}
              />
              <FieldError errors={errors} name="business.supportEmail" />
            </div>
            <div>
              <label className="te-label" htmlFor="nv-phone">
                Support phone
              </label>
              <input
                className="te-input"
                id="nv-phone"
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="1800 000 0000"
                value={supportPhone}
              />
              <FieldError errors={errors} name="business.supportPhone" />
            </div>
          </div>
        </Card>

        <Card title="2 Store">
          <div className="te-form-grid">
            <div className="te-form-grid__wide">
              <label className="te-label" htmlFor="nv-slug">
                Slug *
              </label>
              <input
                className="te-input te-mono"
                id="nv-slug"
                onChange={(e) => {
                  setSlugEdited(true)
                  setSlug(e.target.value.toLowerCase())
                }}
                placeholder="brasskraft"
                value={effectiveSlug}
              />
              <p className="te-muted te-small">
                Store address:{' '}
                <span className="te-mono">
                  {effectiveSlug || 'slug'}.{platformDomain}
                </span>{' '}
                · cannot be changed later
              </p>
              <FieldError errors={errors} name="store.slug" />
            </div>
            <div>
              <span className="te-label">Default language</span>
              <p className="te-derived">
                English <Pill>more in P2</Pill>
              </p>
            </div>
            <div>
              <span className="te-label">Currency and time zone</span>
              <p className="te-derived">INR (₹) · Asia/Kolkata</p>
            </div>
          </div>
          <Notice>
            Storefront design: uses the shared default kit until our team adds{' '}
            <span className="te-mono">src/storefront/vendors/{effectiveSlug || 'slug'}</span>.
            Design is never set from this panel.
          </Notice>
        </Card>

        <Card title="3 Plan and trial">
          <p className="te-muted te-small">The plan caps features, connectors and limits.</p>
          <div className="te-plan-options" role="radiogroup">
            {plans.map((option) => (
              <label
                className={`te-plan-option${option.id === planId ? ' te-plan-option--selected' : ''}`}
                key={option.id}
              >
                <input
                  checked={option.id === planId}
                  name="plan"
                  onChange={() => setPlanId(option.id)}
                  type="radio"
                />
                <span className="te-strong">{option.name}</span>
                <span>{formatINR(option.priceMonthlyMinor)} / month</span>
                <span className="te-muted te-small">
                  {option.maxProducts.toLocaleString('en-IN')} products · {option.maxStaffUsers}{' '}
                  staff
                </span>
              </label>
            ))}
          </div>
          <div className="te-form-grid">
            <div>
              <label className="te-label" htmlFor="nv-trial">
                Free trial
              </label>
              <select
                className="te-input"
                id="nv-trial"
                onChange={(e) => setTrialDays(Number(e.target.value))}
                value={trialDays}
              >
                {[0, 7, 14, 30].map((days) => (
                  <option key={days} value={days}>
                    {days === 0 ? 'No trial' : `${days} days`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="te-label" htmlFor="nv-cycle">
                Billing
              </label>
              <select
                className="te-input"
                id="nv-cycle"
                onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
                value={billingCycle}
              >
                <option value="monthly">Monthly, manual</option>
                <option value="yearly">Yearly, manual</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="4 Starting features">
          <p className="te-muted te-small">
            {industries.length
              ? `Preset for ${industries.map((i) => INDUSTRIES.find((x) => x.value === i)?.label).join(' + ')}.`
              : 'Pick an industry to apply its preset.'}{' '}
            You can change these any time from the Features tab.
          </p>
          <ul className="te-feature-list">
            {featureRows.map((feature) => {
              const inPlan = (plan?.allowedModules ?? []).includes(feature.key)
              const presetOn = preset[feature.key]
              return (
                <li key={feature.key}>
                  <label className={`te-switch-row${inPlan ? '' : ' te-switch-row--locked'}`}>
                    <span className="te-switch">
                      <input
                        checked={switches[feature.key]}
                        disabled={!inPlan}
                        onChange={(e) => toggleFeature(feature.key, e.target.checked)}
                        type="checkbox"
                      />
                      <span className="te-switch__track" />
                    </span>
                    <span>{feature.label}</span>
                    {!inPlan ? (
                      <Pill>Not in {plan?.name ?? 'plan'}</Pill>
                    ) : presetOn && !feature.defaultOn ? (
                      <Pill tone="info">preset</Pill>
                    ) : null}
                  </label>
                </li>
              )
            })}
            {FEATURES.filter((f) => f.group === 'phase-2').length ? (
              <li className="te-muted te-small">
                Phase 2 modules (trade accounts, warranty, loyalty, compare…) are switched on later
                from the Features tab.
              </li>
            ) : null}
          </ul>
        </Card>

        <Card title="5 Owner login">
          <p className="te-muted te-small">The owner can add their own staff later.</p>
          <div className="te-form-grid">
            <div>
              <label className="te-label" htmlFor="nv-owner">
                Owner name *
              </label>
              <input
                className="te-input"
                id="nv-owner"
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Hitesh Vora"
                value={ownerName}
              />
              <FieldError errors={errors} name="owner.name" />
            </div>
            <div>
              <label className="te-label" htmlFor="nv-owner-email">
                Owner email *
              </label>
              <input
                className="te-input"
                id="nv-owner-email"
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="hitesh@brasskraft.example"
                type="email"
                value={ownerEmail}
              />
              <FieldError errors={errors} name="owner.email" />
            </div>
            <div>
              <label className="te-label" htmlFor="nv-owner-phone">
                Mobile
              </label>
              <input
                className="te-input"
                id="nv-owner-phone"
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="+91 90000 00000"
                value={ownerPhone}
              />
              <FieldError errors={errors} name="owner.phone" />
            </div>
            <div>
              <span className="te-label">Security</span>
              <label className="te-checkbox">
                <input
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  type="checkbox"
                />{' '}
                Email the invite now
              </label>
            </div>
          </div>
        </Card>
      </div>

      <div className="te-stack te-sticky">
        <Card title="Will be created">
          <Rows>
            <Row primary="Draft store" secondary={name || '—'} />
            <Row
              primary="Address"
              secondary={
                <span className="te-mono">{(effectiveSlug || 'slug') + '.' + platformDomain}</span>
              }
            />
            <Row
              primary="Plan"
              secondary={`${plan?.name ?? '—'}${trialDays ? `, ${trialDays}-day trial` : ', no trial'}`}
            />
            <Row
              primary="Features"
              secondary={`${onCount} on from the defaults${industries.length ? ' and the preset' : ''}`}
            />
            <Row
              primary="Owner invite"
              secondary={
                ownerEmail
                  ? sendInvite
                    ? `Emailed to ${ownerEmail}`
                    : `For ${ownerEmail}, not emailed yet`
                  : '—'
              }
            />
          </Rows>
          {errors._ ? (
            <p className="te-text--danger te-small" role="alert">
              {errors._}
            </p>
          ) : null}
          <Button disabled={busy || !plan} onClick={() => void submit()}>
            Create vendor
          </Button>
          <p className="te-muted te-small">
            The store goes live when you press Go live on its overview.
          </p>
        </Card>
        <Notice tone="warning">
          Next steps for our team: start the WhatsApp (Meta) and SMS (DLT) approvals on day one,
          because they take a few days. Then the vendor UI folder, CSV import, Razorpay keys and
          shipping zones (docs/10, docs/18).
        </Notice>
      </div>
    </div>
  )
}
