import { cookies, headers } from 'next/headers'

import { getPayloadClient } from '@/lib/data/payload'
import { getStoreByHost } from '@/lib/data/store'
import { renderInvoicesHtml } from '@/modules/tax-invoicing'
import { STORE_HOST_HEADER } from '@/storefront/constants'
import { canSeeOrder, ORDER_COOKIE } from '@/storefront/shop/orderAccess'

/**
 * The shopper's GST invoice (docs/screens Order confirmed "Download invoice"), for the browser
 * that placed the order (signed cookie) only; the order number alone never opens it.
 */
export async function GET(request: Request) {
  const host = (await headers()).get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  const number = new URL(request.url).searchParams.get('order') ?? ''
  const notFound = () => new Response('Not found', { status: 404 })
  if (!store || !number) return notFound()
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [{ tenant: { equals: store.tenantId } }, { orderNumber: { equals: number } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const order = docs[0]
  if (
    !order?.invoice ||
    !canSeeOrder((await cookies()).get(ORDER_COOKIE)?.value, String(order.id))
  ) {
    return notFound()
  }
  const { docs: invoices } = await payload.find({
    collection: 'invoices',
    where: { and: [{ tenant: { equals: store.tenantId } }, { order: { equals: order.id } }] },
    sort: 'issuedAt',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return new Response(renderInvoicesHtml(invoices, `Invoice for ${order.orderNumber}`), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
