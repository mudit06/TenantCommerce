import { idOf } from '@/access'
import type { ProductPageData } from '@/lib/data/catalog'
import { offerForProduct, type StoreOffers } from '@/lib/data/offers'
import { variantAxes } from '@/modules/catalog'

import type { PickerAxis } from '../kit/product/ProductEnquiry'
import type { BuyVariant } from '../kit/shop/BuyBox'

/**
 * What a shopper can choose and what each choice costs, for the product page's buy box and the
 * cards' quick add (docs/screens storefront `st-product`): the variant axes with their swatches,
 * and every variant with its price, MRP, stock and live scheme price. Server only; the cart prices
 * again when something is added.
 */
export function buyOptionsFor(
  data: Pick<ProductPageData, 'product' | 'attributeSet' | 'variants'>,
  offers: StoreOffers | null,
): { axes: PickerAxis[]; variants: BuyVariant[]; categoryIds: string[] } {
  const { product, attributeSet, variants } = data
  const attributes = attributeSet?.attributes ?? []
  const values = (product.attributes ?? {}) as Record<string, unknown>
  const axes = variantAxes(attributes, values).map((axis) => ({
    ...axis,
    options: axis.options.map((option) => ({
      ...option,
      swatchHex:
        attributes.find((a) => a.code === axis.code)?.options?.find((o) => o.value === option.value)
          ?.swatchHex ?? null,
    })),
  }))
  const categoryIds = [
    idOf(product.primaryCategory),
    ...(product.categories ?? []).map((c) => idOf(c)),
  ].filter((id): id is string => Boolean(id))
  return {
    axes,
    categoryIds,
    variants: variants.map((v) => ({
      id: String(v.id),
      options: Object.fromEntries(
        Object.entries((v.options ?? {}) as Record<string, unknown>).map(([k, val]) => [
          k,
          String(val),
        ]),
      ),
      priceMinor: v.price?.amountMinor ?? product.price?.amountMinor ?? 0,
      mrpMinor: v.compareAtPrice?.amountMinor ?? product.compareAtPrice?.amountMinor ?? null,
      sku: v.sku ?? null,
      available: v.allowBackorder ? null : Math.max(0, (v.stockQty ?? 0) - (v.reservedQty ?? 0)),
      offerMinor: offers
        ? (offerForProduct(offers, {
            id: product.id,
            variantId: String(v.id),
            categoryIds,
            priceMinor: v.price?.amountMinor ?? product.price?.amountMinor ?? null,
            purchaseMode: product.purchaseMode,
          })?.priceMinor ?? null)
        : null,
    })),
  }
}
