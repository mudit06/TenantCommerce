import type { UIFieldServerComponent } from 'payload'

import { idOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { Card } from '@/admin/ui'
import { Icon } from '@/admin/ui/icons'
import { formatDayMonth } from '@/lib/dates'
import { categoryAncestors, covers, describeScheme, schemeRule } from '@/modules/promotions'

/**
 * "Offers and reviews" beside a product (docs/screens `cms-product-edit` rule 8): the schemes
 * that cover it now or next, by the same rule as checkout, and its rating from published reviews.
 * Offer prices are never typed on the product; they live in Schemes and offers.
 */
export const ProductOffers: UIFieldServerComponent = async ({ id, data, req }) => {
  if (!id) return null
  const tenantId = idOf(data?.tenant)
  if (!tenantId) return null
  const { payload } = req
  const [schemes, ancestors, pending] = await Promise.all([
    payload.find({
      collection: 'schemes',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { status: { in: ['live', 'scheduled'] } },
          { endsAt: { greater_than: new Date().toISOString() } },
        ],
      },
      sort: 'startsAt',
      depth: 0,
      limit: 50,
      overrideAccess: true,
    }),
    categoryAncestors(payload, tenantId),
    payload.count({
      collection: 'reviews',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { product: { equals: id } },
          { status: { equals: 'pending' } },
        ],
      },
      overrideAccess: true,
    }),
  ])
  const own = [
    idOf(data?.primaryCategory),
    ...((data?.categories ?? []) as unknown[]).map(idOf),
  ].filter((c): c is string => Boolean(c))
  const categoryIds = [...new Set(own.flatMap((c) => [c, ...(ancestors.get(c) ?? [])]))]
  const offers = schemes.docs
    .map((doc) => ({ doc, rule: schemeRule(doc) }))
    .filter(({ rule }) => covers(rule.covers, { productId: String(id), categoryIds }))
    .slice(0, 3)
  const rating = data?.rating as { average?: number | null; count?: number | null } | undefined

  return (
    <Card className="te-card--sidebar" title="Offers and reviews">
      <ul className="te-health">
        {offers.length ? (
          offers.map(({ doc, rule }) => (
            <li key={doc.id}>
              <Icon name="calendar" size={14} />
              <a href={adminUrl.doc('schemes', doc.id)}>
                {doc.name}{' '}
                <span className="te-muted te-small">
                  {doc.status === 'live'
                    ? `until ${formatDayMonth(doc.endsAt)}`
                    : `from ${formatDayMonth(doc.startsAt)}`}
                </span>
              </a>
              <b className="te-small">{describeScheme(rule)}</b>
            </li>
          ))
        ) : (
          <li>
            <Icon name="calendar" size={14} />
            <span className="te-muted">No scheme covers this product</span>
            <a className="te-small" href={adminUrl.collection('schemes')}>
              Schemes
            </a>
          </li>
        )}
        <li>
          <Icon name="star" size={14} />
          <a href={adminUrl.filtered('reviews', 'product', String(id))}>
            {rating?.count
              ? `${(rating.average ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} from ${rating.count} review${rating.count === 1 ? '' : 's'}`
              : 'No reviews yet'}
          </a>
          {pending.totalDocs ? (
            <span className="te-small te-text--warning">{pending.totalDocs} waiting</span>
          ) : null}
        </li>
      </ul>
      <p className="te-muted te-small">
        Launch and festival prices are schemes, so this product’s own price and MRP stay as they
        are.
      </p>
    </Card>
  )
}
