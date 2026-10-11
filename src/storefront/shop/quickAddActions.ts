'use server'

import { getProductBySlug } from '@/lib/data/catalog'
import { getStoreOffers, offerForProduct } from '@/lib/data/offers'
import { getSellingInfo } from '@/lib/data/store'

import type { PickerAxis } from '../kit/product/ProductEnquiry'
import { mediaUrl } from '../kit/media'
import type { BuyOffer, BuyVariant } from '../kit/shop/BuyBox'
import type { ShopResult } from './actions'
import { buyOptionsFor } from './buyOptions'
import { currentStore } from './server'

export type QuickAddOptions = {
  productId: string
  title: string
  modelNumber: string
  image: { url: string; alt: string } | null
  axes: PickerAxis[]
  variants: BuyVariant[]
  basePriceMinor: number | null
  baseMrpMinor: number | null
  offer: BuyOffer | null
}

/**
 * A card's quick add (home blocks, listings): the product's finishes and sizes with their prices,
 * stock and live scheme price, from the request's own store. Adding goes through addToCart, which
 * prices the line again on the server.
 */
export async function quickAddOptions(slug: string): Promise<ShopResult<QuickAddOptions>> {
  const store = await currentStore()
  if (!store) return { ok: false, message: 'This store isn’t taking orders at the moment.' }
  const [data, selling, offers] = await Promise.all([
    getProductBySlug(store.tenantId, String(slug)),
    getSellingInfo(store.tenantId),
    getStoreOffers(store.tenantId),
  ])
  const product = data?.product
  if (
    !data ||
    !product ||
    !selling.selling ||
    product.purchaseMode === 'enquire' ||
    !product.price?.amountMinor
  ) {
    return {
      ok: false,
      message: 'This product can’t be bought online. Open it to ask for a quote.',
    }
  }
  const { axes, variants, categoryIds } = buyOptionsFor(data, offers)
  const offer = offerForProduct(offers, {
    id: product.id,
    categoryIds,
    priceMinor: product.price.amountMinor,
    purchaseMode: product.purchaseMode,
  })
  const photo = product.gallery?.find((p) => typeof p === 'object' && p !== null)
  const photoUrl =
    photo && typeof photo === 'object'
      ? mediaUrl(photo.sizes?.thumb?.url ?? photo.sizes?.card?.url ?? photo.url)
      : undefined
  return {
    ok: true,
    data: {
      productId: String(product.id),
      title: product.title,
      modelNumber: product.modelNumber,
      image: photoUrl
        ? { url: photoUrl, alt: (typeof photo === 'object' && photo?.alt) || product.title }
        : null,
      axes,
      variants,
      basePriceMinor: product.price.amountMinor,
      baseMrpMinor: product.compareAtPrice?.amountMinor ?? null,
      offer: offer
        ? { badge: offer.badge, until: offer.until, priceMinor: offer.priceMinor }
        : null,
    },
  }
}
