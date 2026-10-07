import type { Where } from 'payload'

/** The Customers screen's filters as a query, shared by the list and its CSV export. */
export function customersWhere(tenantId: string, params: URLSearchParams): Where {
  const and: Where[] = [{ tenant: { equals: tenantId } }]
  const q = params.get('q')?.trim()
  if (q) {
    const digits = q.replace(/[^0-9]/g, '')
    and.push({
      or: [
        { name: { like: q } },
        { email: { like: q.toLowerCase() } },
        ...(digits.length >= 4 ? [{ phone: { like: digits.slice(-10) } }] : []),
      ],
    })
  }
  const role = params.get('role')
  if (role === 'affiliate') and.push({ roles: { contains: 'affiliate' } })
  if (role === 'shopper') and.push({ roles: { not_in: ['affiliate'] } })
  const offers = params.get('offers')
  if (offers === 'email') and.push({ 'marketingConsent.email': { equals: true } })
  if (offers === 'whatsapp') and.push({ 'marketingConsent.whatsapp': { equals: true } })
  if (offers === 'none') {
    and.push({ 'marketingConsent.email': { not_equals: true } })
    and.push({ 'marketingConsent.whatsapp': { not_equals: true } })
  }
  return { and }
}
