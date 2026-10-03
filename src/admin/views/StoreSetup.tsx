import type { CollectionSlug, Payload, Where } from 'payload'

import { adminUrl } from '@/admin/paths'
import { Card, Pill, Row, Rows } from '@/admin/ui'

type Step = { label: string; hint: string; href: string; done: boolean; count?: number }

/**
 * Setting up a store for its first storefront (docs/progress.md stage A), as a checklist on the
 * store dashboard. Counts are read per store with an explicit tenant filter (docs/04).
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

  const [
    settings,
    attributeSets,
    categories,
    media,
    policiesLive,
    homeLive,
    dealers,
    newEnquiries,
  ] = await Promise.all([
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
    count('pages', {
      and: [{ template: { equals: 'policy' } }, { _status: { equals: 'published' } }],
    }),
    count('pages', { and: [{ slug: { equals: 'home' } }, { _status: { equals: 'published' } }] }),
    has('dealer-locator') ? count('dealers') : Promise.resolve(0),
    has('enquiries') ? count('enquiries', { status: { equals: 'new' } }) : Promise.resolve(0),
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
      label: 'Policy pages published',
      hint: 'Shipping, returns, privacy, terms, warranty',
      href: adminUrl.collection('pages'),
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
  return (
    <>
      {has('enquiries') && newEnquiries > 0 ? (
        <Card title="Enquiries">
          <Rows>
            <Row
              aside={<Pill tone="info">{newEnquiries} new</Pill>}
              href={`${adminUrl.collection('enquiries')}?where[status][in][0]=new`}
              primary="New enquiries waiting for a reply"
            />
          </Rows>
        </Card>
      ) : null}
      <Card
        actions={
          <Pill
            tone={done === steps.length ? 'success' : 'neutral'}
          >{`${done} of ${steps.length}`}</Pill>
        }
        title="Set up your store"
      >
        <Rows>
          {steps.map((step) => (
            <Row
              aside={
                step.done ? (
                  <Pill tone="success">
                    {step.count !== undefined ? `Done · ${step.count}` : 'Done'}
                  </Pill>
                ) : (
                  <Pill tone="warning">To do</Pill>
                )
              }
              href={step.href}
              key={step.label}
              primary={step.label}
              secondary={step.hint}
            />
          ))}
        </Rows>
        <p className="te-muted te-small">
          Products and variants come next. Orders, payments and shipping follow in the selling
          stage.
        </p>
      </Card>
    </>
  )
}
