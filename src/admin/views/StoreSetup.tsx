import type { CollectionSlug, Payload, Where } from 'payload'

import { adminUrl } from '@/admin/paths'
import { Card } from '@/admin/ui'
import { Icon } from '@/admin/ui/icons'

type Step = { label: string; hint: string; href: string; done: boolean; count?: number }

/**
 * Setting up a store for its first storefront (docs/progress.md stage A): the wireframe's launch
 * checklist on the store dashboard, gone once every step is done (cms-dashboard rule 2). Counts
 * are read per store with an explicit tenant filter (docs/04).
 */
export async function StoreSetup({
  payload,
  tenantId,
  enabledFeatures,
}: {
  payload: Payload
  tenantId: string
  enabledFeatures: readonly string[]
}) {
  const count = async (collection: CollectionSlug, extra?: Where) =>
    (
      await payload.count({
        collection,
        where: { and: [{ tenant: { equals: tenantId } }, ...(extra ? [extra] : [])] },
        overrideAccess: true,
      })
    ).totalDocs
  const has = (feature: string) => enabledFeatures.includes(feature)

  const [settings, attributeSets, categories, media, products, policiesLive, homeLive, dealers] =
    await Promise.all([
      payload
        .find({
          collection: 'site-settings',
          where: { tenant: { equals: tenantId } },
          depth: 0,
          limit: 1,
          overrideAccess: true,
        })
        .then((result) => result.docs[0]),
      count('attribute-sets'),
      count('categories'),
      count('media'),
      count('products', { status: { equals: 'active' } }),
      count('pages', {
        and: [{ template: { equals: 'policy' } }, { _status: { equals: 'published' } }],
      }),
      count('pages', { and: [{ slug: { equals: 'home' } }, { _status: { equals: 'published' } }] }),
      has('dealer-locator') ? count('dealers') : Promise.resolve(0),
    ])
  const menuItems = await payload
    .find({
      collection: 'navigation',
      where: { tenant: { equals: tenantId } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    .then((result) => result.docs[0]?.header?.length ?? 0)

  const steps: Step[] = [
    {
      label: 'Store settings',
      hint: 'Logo, contact numbers, grievance officer, invoice details',
      href: adminUrl.collection('site-settings'),
      done: Boolean(settings?.logo && settings?.contact?.phone && settings?.grievanceOfficer?.name),
    },
    {
      label: 'Attribute sets',
      hint: 'Specification fields and filters for each kind of product',
      href: adminUrl.collection('attribute-sets'),
      done: attributeSets > 0,
      count: attributeSets,
    },
    {
      label: 'Categories',
      hint: 'The category tree shoppers browse',
      href: adminUrl.collection('categories'),
      done: categories > 0,
      count: categories,
    },
    {
      label: 'Media library',
      hint: 'Product photos, banners, PDFs',
      href: adminUrl.collection('media'),
      done: media > 0,
      count: media,
    },
    {
      label: 'Products live',
      hint: 'At least one active product with photos',
      href: adminUrl.collection('products'),
      done: products > 0,
      count: products,
    },
    {
      label: 'Policy pages published',
      hint: 'Shipping, returns, privacy, terms, warranty',
      href: `${adminUrl.pages}?template=policy`,
      done: policiesLive >= 5,
      count: policiesLive,
    },
    {
      label: 'Home page published',
      hint: 'Build it from blocks: hero, category tiles, products',
      href: adminUrl.collection('pages'),
      done: homeLive > 0,
    },
    {
      label: 'Menus',
      hint: 'Header, footer and phone menu',
      href: adminUrl.collection('navigation'),
      done: menuItems > 0,
    },
    ...(has('dealer-locator')
      ? [
          {
            label: 'Dealers',
            hint: 'Shown on the dealer locator',
            href: adminUrl.collection('dealers'),
            done: dealers > 0,
            count: dealers,
          },
        ]
      : []),
  ]
  const done = steps.filter((step) => step.done).length
  if (done === steps.length) return null
  return (
    <Card
      actions={
        <div
          aria-label={`${done} of ${steps.length} done`}
          aria-valuemax={steps.length}
          aria-valuemin={0}
          aria-valuenow={done}
          className="te-checklist__bar"
          role="progressbar"
        >
          <i style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
      }
      title={`Launch checklist · ${done} of ${steps.length} done`}
    >
      <ul className="te-checklist">
        {steps.map((step) => (
          <li className={step.done ? 'te-checklist__item--done' : undefined} key={step.label}>
            <span aria-hidden className="te-checklist__box">
              {step.done ? <Icon name="check" size={11} strokeWidth={3} /> : null}
            </span>
            <span className="te-checklist__label" title={step.hint}>
              {step.label}
              {step.done && step.count ? <span className="te-muted"> · {step.count}</span> : null}
              <span className="te-visually-hidden">{step.done ? ' (done)' : ' (to do)'}</span>
            </span>
            {step.done ? null : (
              <a className="te-chip-link" href={step.href}>
                Open
              </a>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
