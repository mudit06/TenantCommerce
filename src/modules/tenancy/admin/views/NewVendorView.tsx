import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { isSuperAdmin } from '@/access'
import { adminUrl } from '@/admin/paths'
import { Notice } from '@/admin/ui'
import { env } from '@/lib/env'

import { NewVendorForm, type PlanOption } from './NewVendorForm'

/** /admin/vendors/new (docs/screens/super-admin.md "New vendor"). */
export async function NewVendorView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  const allowed = isSuperAdmin(req.user)
  const plans: PlanOption[] = allowed
    ? (
        await req.payload.find({
          collection: 'plans',
          where: { isActive: { equals: true } },
          sort: 'sortOrder',
          depth: 0,
          pagination: false,
          overrideAccess: true,
        })
      ).docs.map((plan) => ({
        id: String(plan.id),
        name: plan.name,
        priceMonthlyMinor: plan.priceMonthly?.amountMinor ?? 0,
        maxProducts: plan.limits.maxProducts,
        maxStaffUsers: plan.limits.maxStaffUsers,
        allowedModules: (plan.allowedModules ?? []) as string[],
        intro:
          plan.introOffer?.price?.amountMinor && plan.introOffer.months
            ? { priceMinor: plan.introOffer.price.amountMinor, months: plan.introOffer.months }
            : null,
      }))
    : []
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <div className="te-page">
        <header className="te-page__header">
          <div>
            <p className="te-breadcrumb">
              <a href={adminUrl.vendors}>Vendors</a> /
            </p>
            <h1 className="te-page__title">New vendor</h1>
            <p className="te-page__subtitle">
              Creates a draft store. It goes live when you switch the store to active.
            </p>
          </div>
        </header>
        {!allowed ? (
          <Notice tone="danger">Only super admins onboard vendors.</Notice>
        ) : plans.length === 0 ? (
          <Notice tone="warning">
            Create a plan first (<a href={adminUrl.plans}>Plans</a>), or run{' '}
            <span className="te-mono">pnpm seed</span>.
          </Notice>
        ) : (
          <NewVendorForm plans={plans} platformDomain={env.PLATFORM_DOMAIN} />
        )}
      </div>
    </DefaultTemplate>
  )
}
