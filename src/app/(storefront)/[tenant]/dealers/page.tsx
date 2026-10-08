import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getDealers } from '@/lib/data/dealers'
import { rankDealers } from '@/modules/dealers'
import { getStoreContext } from '@/storefront/context'
import { DealerFinder, type DealerCard } from '@/storefront/kit/dealers/DealerFinder'
import { Container } from '@/storefront/kit/ui'
import { storeWhatsApp } from '@/storefront/kit/whatsapp'

export const metadata: Metadata = { title: 'Find a dealer' }

type Props = {
  params: Promise<{ tenant: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const TYPE_LABELS: Record<string, string> = {
  dealer: 'Dealer',
  distributor: 'Distributor',
  showroom: 'Showroom',
  'service-centre': 'Service centre',
  'experience-centre': 'Experience centre',
}
const PLURAL: Record<string, string> = {
  dealer: 'Dealers',
  distributor: 'Distributors',
  showroom: 'Showrooms',
  'service-centre': 'Service centres',
  'experience-centre': 'Experience centres',
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

/**
 * Dealer locator (docs/screens storefront `st-dealers`): the store's dealers nearest a pincode,
 * a city or the phone's location, with Call, WhatsApp and Directions. Needs dealer-locator.
 */
export default async function DealersPage({ params, searchParams }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  if (!ctx.hasFeature('dealer-locator')) notFound()
  const search = await searchParams
  const near = one(search.near).slice(0, 60)
  const lat = Number(one(search.lat))
  const lng = Number(one(search.lng))
  const hasPosition =
    Boolean(one(search.lat)) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !Number.isNaN(lng)
  const all = await getDealers(ctx.store.tenantId)
  const { dealers, matched } = rankDealers(all, hasPosition ? { lat, lng } : { q: near || null })
  const storeName = ctx.settings?.storeName ?? ctx.store.name
  const cards: DealerCard[] = dealers.map((d) => {
    const place = d.location
      ? `${d.location[1]},${d.location[0]}`
      : `${d.name}, ${d.address}, ${d.city} ${d.pincode}`
    return {
      id: d.id,
      name: d.name,
      type: d.type,
      typeLabel: TYPE_LABELS[d.type] ?? 'Dealer',
      address: [d.address, `${d.city} ${d.pincode}`].join(', '),
      hours: d.hours,
      distance:
        d.distanceKm === null
          ? null
          : d.approximate && d.distanceKm < 1
            ? 'In your area'
            : `${d.approximate ? 'about ' : ''}${d.distanceKm < 10 ? d.distanceKm.toFixed(1) : Math.round(d.distanceKm)} km`,
      callHref: `tel:${d.phone.replace(/[^\d+]/g, '')}`,
      whatsappHref: storeWhatsApp(d.phone, `Hello, I found you on ${storeName}'s website.`),
      directionsHref: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`,
      mapSrc: d.location
        ? `https://maps.google.com/maps?q=${d.location[1]},${d.location[0]}&z=14&output=embed`
        : null,
    }
  })
  const types = [...new Set(all.map((d) => d.type))].map((value) => ({
    value,
    label: PLURAL[value] ?? 'Dealers',
  }))
  const note = !all.length
    ? null
    : !matched && near
      ? `No dealer found for “${near}” yet. Here are all ${all.length}.`
      : hasPosition
        ? 'Nearest to you first.'
        : near
          ? `Nearest to ${near} first.`
          : null

  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">Find a dealer</h1>
          <p className="mt-1 text-ink-soft">See {storeName} products in person near you.</p>
        </header>
        {all.length ? (
          <DealerFinder dealers={cards} note={note} query={near} types={types} />
        ) : (
          <p className="text-ink-soft">Dealers will be listed here soon.</p>
        )}
      </div>
    </Container>
  )
}
