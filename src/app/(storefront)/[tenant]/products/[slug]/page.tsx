import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { idOf } from '@/access'
import { getStoreOffers, offerForProduct } from '@/lib/data/offers'
import { getProductBySlug, getProductReviews, getProductsInCategories } from '@/lib/data/catalog'
import { variantAxes } from '@/modules/catalog'
import { whatsappNumber } from '@/modules/enquiries'
import { getStoreContext } from '@/storefront/context'
import { Breadcrumbs } from '@/storefront/kit/Breadcrumbs'
import { FileIcon } from '@/storefront/kit/icons'
import { mediaUrl, Img } from '@/storefront/kit/media'
import { Gallery } from '@/storefront/kit/product/Gallery'
import { LegalDetails } from '@/storefront/kit/product/LegalDetails'
import { ProductGrid } from '@/storefront/kit/product/ProductCard'
import { ProductEnquiry } from '@/storefront/kit/product/ProductEnquiry'
import { QuoteForm } from '@/storefront/kit/product/QuoteForm'
import { ProductReviews } from '@/storefront/kit/reviews/ProductReviews'
import { Stars } from '@/storefront/kit/reviews/Stars'
import { formatINR } from '@/lib/money'
import { RememberView } from '@/storefront/kit/pwa/RememberView'
import { BuyBox } from '@/storefront/kit/shop/BuyBox'
import { HeartButton } from '@/storefront/kit/shop/HeartButton'
import { SpecTable } from '@/storefront/kit/product/SpecTable'
import { RichText } from '@/storefront/kit/RichText'
import { Container, SectionHeading } from '@/storefront/kit/ui'

type Props = { params: Promise<{ tenant: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant, slug } = await params
  const ctx = await getStoreContext(tenant)
  const data = await getProductBySlug(ctx.store.tenantId, slug)
  if (!data) return {}
  const { product } = data
  const image = product.gallery?.[0]
  return {
    title: product.seo?.title || `${product.title}`,
    description:
      product.seo?.description ||
      product.shortDescription ||
      `${product.title}, model ${product.modelNumber}.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      images:
        typeof image === 'object' && image?.url
          ? [mediaUrl(image.sizes?.detail?.url ?? image.url)!]
          : undefined,
    },
  }
}

/** Product page (docs/screens storefront `st-product`), catalogue mode: quote and WhatsApp. */
export default async function ProductPage({ params }: Props) {
  const { tenant, slug } = await params
  const ctx = await getStoreContext(tenant)
  const data = await getProductBySlug(ctx.store.tenantId, slug)
  if (!data) notFound()
  const { product, attributeSet, category, documents, variants } = data
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
  const name = ctx.settings?.storeName ?? ctx.store.name
  // Sold online when the store takes orders and the product has a price (docs/12 purchase modes)
  const buying =
    ctx.selling.selling && product.purchaseMode !== 'enquire' && Boolean(product.price?.amountMinor)
  const photos = (product.gallery ?? []).filter(
    (photo) => typeof photo === 'object' && photo !== null,
  )
  const node = ctx.categories.all.find((c) => String(c.id) === String(category?.id))
  const crumbs = [
    { label: 'Home', href: '/' },
    ...(category?.breadcrumbs ?? []).map((crumb) => ({
      label: crumb.label ?? '',
      href: crumb.url ?? '#',
    })),
    { label: product.title, href: `/products/${product.slug}` },
  ]
  const related = node
    ? (await getProductsInCategories(ctx.store.tenantId, [String(node.id)]))
        .filter((p) => p.id !== product.id)
        .slice(0, 4)
    : []
  const pageUrl = `${ctx.origin}/products/${product.slug}`
  // A live scheme's price and badge; the cart and checkout price again on the server
  const storeFeatures = await getStoreOffers(ctx.store.tenantId)
  const offers = buying ? storeFeatures : null
  // Published reviews from buyers, when the store shows them (docs/screens Product page rule 11)
  const reviews = storeFeatures.reviewsShown
    ? await getProductReviews(ctx.store.tenantId, String(product.id))
    : null
  const productCategories = [
    idOf(product.primaryCategory),
    ...(product.categories ?? []).map((c) => idOf(c)),
  ].filter((id): id is string => Boolean(id))
  const productOffer = offers
    ? offerForProduct(offers, {
        id: product.id,
        categoryIds: productCategories,
        priceMinor: product.price?.amountMinor ?? null,
        purchaseMode: product.purchaseMode,
      })
    : null
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    sku: product.modelNumber,
    mpn: product.modelNumber,
    brand: { '@type': 'Brand', name },
    description: product.shortDescription ?? undefined,
    image: photos
      .map((photo) => (typeof photo === 'object' ? `${ctx.origin}${mediaUrl(photo.url)}` : ''))
      .filter(Boolean),
    countryOfOrigin: product.legal?.countryOfOrigin ?? undefined,
    offers:
      buying && product.price?.amountMinor
        ? {
            '@type': 'Offer',
            url: pageUrl,
            priceCurrency: 'INR',
            price: ((productOffer?.priceMinor ?? product.price.amountMinor) / 100).toFixed(2),
            availability:
              variants.length === 0 ||
              variants.some((v) => v.allowBackorder || (v.stockQty ?? 0) - (v.reservedQty ?? 0) > 0)
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
          }
        : undefined,
  }

  const firstPhoto = photos.find((photo) => typeof photo === 'object')
  return (
    <Container className="py-6">
      <RememberView
        image={typeof firstPhoto === 'object' ? (mediaUrl(firstPhoto?.url) ?? null) : null}
        path={`/products/${product.slug}`}
        price={
          buying && product.price?.amountMinor
            ? formatINR(productOffer?.priceMinor ?? product.price.amountMinor)
            : null
        }
        title={product.title}
      />
      <Breadcrumbs items={crumbs} origin={ctx.origin} />
      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Gallery
          slides={photos.map((photo, i) => (
            <Img
              className="size-full object-contain"
              key={i}
              media={photo}
              priority={i === 0}
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          ))}
          thumbs={photos.map((photo, i) => (
            <Img className="size-full object-cover" key={i} media={photo} sizes="80px" />
          ))}
          title={product.title}
        />
        <div>
          {category ? (
            <p className="text-xs font-semibold tracking-wider text-accent uppercase">
              {category.name}
            </p>
          ) : null}
          <h1 className="mt-1 font-heading text-2xl leading-tight font-bold sm:text-3xl">
            {product.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
            <span>
              Model no. <span className="font-semibold text-ink">{product.modelNumber}</span>
            </span>
            {reviews?.count && product.rating?.average ? (
              <a className="inline-flex items-center gap-1.5 hover:underline" href="#reviews">
                <Stars value={product.rating.average} />
                <span className="font-semibold text-ink">{product.rating.average.toFixed(1)}</span>
                <span>
                  {reviews.count} review{reviews.count === 1 ? '' : 's'}
                </span>
              </a>
            ) : null}
            {storeFeatures.wishlistOn ? (
              <HeartButton
                className="inline-flex items-center gap-1.5 rounded-card border border-line px-2.5 py-1 text-sm text-ink hover:border-ink/40"
                label={product.title}
                productId={String(product.id)}
                withText
              />
            ) : null}
          </p>
          {product.shortDescription ? (
            <p className="mt-4 leading-relaxed text-ink-soft">{product.shortDescription}</p>
          ) : null}
          {buying ? null : (
            <p className="mt-4 rounded-card bg-surface-alt px-4 py-3 text-sm text-ink">
              Price on request. Tell us the finish, size and quantity you need and we’ll send you a
              quote.
            </p>
          )}
          {product.highlights?.length ? (
            <ul className="mt-5 space-y-1.5 text-sm">
              {product.highlights.map((item, i) => (
                <li className="flex gap-2" key={item.id ?? i}>
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                  {item.text}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-6">
            {buying ? (
              <BuyBox
                axes={axes}
                baseMrpMinor={product.compareAtPrice?.amountMinor ?? null}
                basePriceMinor={product.price?.amountMinor ?? null}
                modelNumber={product.modelNumber}
                pincodeCheck={ctx.hasFeature('pincode-check')}
                productId={String(product.id)}
                offer={productOffer}
                quoteHref={
                  ctx.hasFeature('enquiries') && product.purchaseMode === 'both' ? '#quote' : null
                }
                variants={variants.map((v) => ({
                  id: String(v.id),
                  options: Object.fromEntries(
                    Object.entries((v.options ?? {}) as Record<string, unknown>).map(([k, val]) => [
                      k,
                      String(val),
                    ]),
                  ),
                  priceMinor: v.price?.amountMinor ?? product.price?.amountMinor ?? 0,
                  mrpMinor:
                    v.compareAtPrice?.amountMinor ?? product.compareAtPrice?.amountMinor ?? null,
                  sku: v.sku ?? null,
                  available: v.allowBackorder
                    ? null
                    : Math.max(0, (v.stockQty ?? 0) - (v.reservedQty ?? 0)),
                  offerMinor: offers
                    ? (offerForProduct(offers, {
                        id: product.id,
                        variantId: String(v.id),
                        categoryIds: productCategories,
                        priceMinor: v.price?.amountMinor ?? product.price?.amountMinor ?? null,
                        purchaseMode: product.purchaseMode,
                      })?.priceMinor ?? null)
                    : null,
                }))}
                whatsappHref={
                  whatsappNumber(ctx.settings?.contact?.whatsapp)
                    ? `https://wa.me/${whatsappNumber(ctx.settings?.contact?.whatsapp)}?text=${encodeURIComponent(`Hello ${name}, I have a question about ${product.title} (${product.modelNumber}). ${pageUrl}`)}`
                    : null
                }
              />
            ) : null}
            {buying &&
            !(ctx.hasFeature('enquiries') && product.purchaseMode === 'both') ? null : buying ? (
              <section
                aria-labelledby="quote-heading"
                className="mt-8 scroll-mt-28 rounded-card border border-line bg-surface-alt p-4 sm:p-6"
                id="quote"
              >
                <h2 className="mb-1 font-heading text-lg font-semibold" id="quote-heading">
                  Request a bulk quote
                </h2>
                <p className="mb-4 text-sm text-ink-soft">
                  For large quantities, projects and trade prices.
                </p>
                <QuoteForm
                  modelNumber={product.modelNumber}
                  page={pageUrl}
                  productTitle={product.title}
                  showQty
                  storeName={name}
                  submitLabel="Send quote request"
                  type="bulk"
                />
              </section>
            ) : (
              <ProductEnquiry
                axes={axes}
                enquiriesOn={ctx.hasFeature('enquiries')}
                modelNumber={product.modelNumber}
                pageUrl={pageUrl}
                storeName={name}
                title={product.title}
                whatsappNumber={whatsappNumber(ctx.settings?.contact?.whatsapp)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="specs">
          <SectionHeading>
            <span id="specs">Specifications</span>
          </SectionHeading>
          <SpecTable
            attributes={attributes}
            extra={[{ label: 'Model number', value: product.modelNumber }]}
            values={values}
          />
        </section>
        <div className="space-y-12">
          {product.description ? (
            <section>
              <SectionHeading>Description</SectionHeading>
              <RichText data={product.description} />
            </section>
          ) : null}
          {documents.length ? (
            <section>
              <SectionHeading>Downloads</SectionHeading>
              <ul className="space-y-2">
                {documents.map((doc) =>
                  typeof doc.file === 'object' && doc.file?.url ? (
                    <li key={doc.id}>
                      <a
                        className="flex items-center gap-3 rounded-card border border-line p-3 text-sm font-semibold hover:border-ink/30"
                        href={mediaUrl(doc.file.url)}
                        rel="noopener"
                        target="_blank"
                      >
                        <FileIcon className="text-accent" /> {doc.title}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </section>
          ) : null}
          <section>
            <SectionHeading>Product details</SectionHeading>
            <LegalDetails legal={product.legal} />
          </section>
        </div>
      </div>

      {reviews?.count && product.rating?.average ? (
        <ProductReviews
          average={product.rating.average}
          bars={reviews.bars}
          count={reviews.count}
          reviews={reviews.reviews}
        />
      ) : null}
      {related.length ? (
        <section className="mt-16">
          <SectionHeading>You may also like</SectionHeading>
          <ProductGrid products={related} />
        </section>
      ) : null}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        type="application/ld+json"
      />
    </Container>
  )
}
