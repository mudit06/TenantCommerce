import Link from 'next/link'
import type { ComponentType } from 'react'

import { getCategoryTree, getDownloads, getProductList, withDescendants } from '@/lib/data/catalog'
import type { Page } from '@/payload-types'

import type { StoreContext } from '../../context'
import { BENEFIT_ICONS, FileIcon } from '../icons'
import { categoryHref, linkHref } from '../links'
import { Img, mediaUrl } from '../media'
import { ProductGrid } from '../product/ProductCard'
import { QuoteForm } from '../product/QuoteForm'
import { RichText } from '../RichText'
import {
  AffiliateInvite,
  CouponList,
  OfferStrip,
  OffersSignupSection,
  SchemeProducts,
  StoreReviews,
} from './GrowthBlocks'
import { buttonClass, ButtonLink, Container, SectionHeading } from '../ui'

type Block = NonNullable<Page['layout']>[number]

const YOUTUBE_ID = /(?:v=|youtu\.be\/)([\w-]{6,})/

/** Renders a page's blocks with the kit's default components (docs/10 "CMS blocks"). */
export async function RenderBlocks({ blocks, ctx }: { blocks: Page['layout']; ctx: StoreContext }) {
  const rendered = await Promise.all(
    (blocks ?? []).map((block, index) => renderBlock(block, ctx, index)),
  )
  return <>{rendered}</>
}

async function renderBlock(block: Block, ctx: StoreContext, index: number) {
  const key = block.id ?? `${block.blockType}-${index}`
  const first = index === 0
  const Own = ctx.ui.blocks[block.blockType] as
    ComponentType<{ block: Block; ctx: StoreContext; first: boolean }> | undefined
  if (Own) return <Own block={block} ctx={ctx} first={first} key={key} />
  switch (block.blockType) {
    case 'hero': {
      const slides = block.slides ?? []
      return (
        <section aria-label="Highlights" className="relative" key={key}>
          <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
            {slides.map((slide, i) => {
              const target = linkHref(slide.buttonLink)
              return (
                <div className="relative w-full shrink-0 snap-start" key={slide.id ?? i}>
                  <picture>
                    {slide.mobileImage && typeof slide.mobileImage === 'object' ? (
                      <source
                        media="(max-width: 767px)"
                        srcSet={mediaUrl(
                          slide.mobileImage.sizes?.detail?.url ?? slide.mobileImage.url,
                        )}
                      />
                    ) : null}
                    <Img
                      className="h-[56vw] max-h-[560px] min-h-[320px] w-full object-cover"
                      media={slide.image}
                      priority={first && i === 0}
                      sizes="100vw"
                    />
                  </picture>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
                  <Container className="absolute inset-0 flex flex-col justify-center">
                    <div className="max-w-xl text-white">
                      <h2 className="font-heading text-3xl leading-tight font-bold [text-transform:var(--heading-transform)] sm:text-5xl">
                        {slide.heading}
                      </h2>
                      {slide.subheading ? (
                        <p className="mt-3 text-base text-white/90 sm:text-lg">
                          {slide.subheading}
                        </p>
                      ) : null}
                      {target && slide.buttonLabel ? (
                        <ButtonLink className="mt-6" href={target.href} newTab={target.newTab}>
                          {slide.buttonLabel}
                        </ButtonLink>
                      ) : null}
                    </div>
                  </Container>
                </div>
              )
            })}
          </div>
        </section>
      )
    }
    case 'banner': {
      const target = linkHref(block.link)
      const image = (
        <Img
          className="h-full w-full object-cover"
          media={block.image}
          sizes="(min-width: 1280px) 1280px, 100vw"
        />
      )
      return (
        <Container className="my-10" key={key}>
          <div className="relative overflow-hidden rounded-card">
            {target ? (
              <Link aria-label={block.heading ?? 'See more'} href={target.href}>
                {image}
              </Link>
            ) : (
              image
            )}
            {block.heading ? (
              <p className="pointer-events-none absolute bottom-4 left-4 rounded-card bg-black/60 px-4 py-2 font-heading text-lg font-semibold text-white [text-transform:var(--heading-transform)]">
                {block.heading}
              </p>
            ) : null}
          </div>
        </Container>
      )
    }
    case 'productGrid': {
      const { all } = await getCategoryTree(ctx.store.tenantId)
      const category = all.find(
        (node) =>
          String(node.id) ===
          (typeof block.category === 'object' ? block.category?.id : block.category),
      )
      const products = await getProductList(
        ctx.store.tenantId,
        block.source,
        block.limit ?? 8,
        category ? withDescendants(category) : undefined,
      )
      if (products.length === 0) return null
      return (
        <Container className="my-12" key={key}>
          <SectionHeading
            action={
              category ? (
                <Link
                  className="text-sm font-semibold text-accent hover:underline"
                  href={category.path}
                >
                  View all
                </Link>
              ) : null
            }
          >
            {block.heading ?? 'Products'}
          </SectionHeading>
          <ProductGrid products={products} />
        </Container>
      )
    }
    case 'categoryTiles': {
      const categories = (block.categories ?? []).filter((c) => typeof c === 'object' && c !== null)
      if (categories.length === 0) return null
      return (
        <Container className="my-12" key={key}>
          {block.heading ? <SectionHeading>{block.heading}</SectionHeading> : null}
          <ul
            className={`grid gap-3 sm:gap-5 ${block.style === 'circles' ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}
          >
            {categories.map((category) =>
              typeof category === 'object' ? (
                <li key={category.id}>
                  <Link className="group block" href={categoryHref(category)}>
                    <div
                      className={`overflow-hidden bg-surface-alt ${block.style === 'circles' ? 'aspect-square rounded-full' : 'aspect-[4/3] rounded-card'}`}
                    >
                      <Img
                        className="size-full object-cover transition duration-300 group-hover:scale-105"
                        media={category.image}
                        sizes="(min-width: 1024px) 25vw, 50vw"
                      />
                    </div>
                    <p className="mt-2 text-center text-sm font-semibold text-ink group-hover:text-accent sm:text-base">
                      {category.name}
                    </p>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </Container>
      )
    }
    case 'richText':
      return (
        <Container className="my-10 max-w-3xl" key={key}>
          <RichText data={block.content} />
        </Container>
      )
    case 'imageText': {
      const target = linkHref(block.buttonLink)
      return (
        <Container className="my-14" key={key}>
          <div
            className={`grid items-center gap-8 md:grid-cols-2 ${block.imageSide === 'right' ? 'md:[&>*:first-child]:order-2' : ''}`}
          >
            <Img
              className="w-full rounded-card object-cover"
              media={block.image}
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <div>
              {block.heading ? <SectionHeading>{block.heading}</SectionHeading> : null}
              <RichText data={block.text} />
              {target && block.buttonLabel ? (
                <ButtonLink className="mt-4" href={target.href} newTab={target.newTab} style="dark">
                  {block.buttonLabel}
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </Container>
      )
    }
    case 'benefits':
      return (
        <section className="my-10 border-y border-line bg-surface-alt" key={key}>
          <Container>
            <ul className="grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
              {(block.items ?? []).map((item, i) => {
                const Icon =
                  BENEFIT_ICONS[(item.icon ?? 'check') as keyof typeof BENEFIT_ICONS] ??
                  BENEFIT_ICONS.check
                return (
                  <li
                    className="flex items-center gap-3 text-sm font-semibold text-ink"
                    key={item.id ?? i}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">
                      <Icon />
                    </span>
                    {item.text}
                  </li>
                )
              })}
            </ul>
          </Container>
        </section>
      )
    case 'testimonials':
      return (
        <Container className="my-14" key={key}>
          {block.heading ? <SectionHeading>{block.heading}</SectionHeading> : null}
          <ul className="grid gap-5 md:grid-cols-3">
            {(block.items ?? []).map((item, i) => (
              <li className="rounded-card border border-line bg-white p-5" key={item.id ?? i}>
                <blockquote className="text-sm leading-relaxed text-ink">“{item.quote}”</blockquote>
                <p className="mt-4 text-sm font-semibold">{item.name}</p>
                {item.place ? <p className="text-xs text-ink-soft">{item.place}</p> : null}
              </li>
            ))}
          </ul>
        </Container>
      )
    case 'faq': {
      const items = block.items ?? []
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
      return (
        <Container className="my-14 max-w-3xl" key={key}>
          {block.heading ? <SectionHeading>{block.heading}</SectionHeading> : null}
          <div className="divide-y divide-line rounded-card border border-line">
            {items.map((item, i) => (
              <details className="group p-4" key={item.id ?? i}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden
                    className="text-xl text-ink-soft transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
          <script
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
            type="application/ld+json"
          />
        </Container>
      )
    }
    case 'video': {
      const id = block.youtubeUrl.match(YOUTUBE_ID)?.[1]
      if (!id) return null
      return (
        <Container className="my-14 max-w-4xl" key={key}>
          {block.heading ? <SectionHeading>{block.heading}</SectionHeading> : null}
          <div className="aspect-video overflow-hidden rounded-card bg-black">
            <iframe
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full"
              loading="lazy"
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title={block.heading ?? 'Video'}
            />
          </div>
          {block.caption ? <p className="mt-2 text-sm text-ink-soft">{block.caption}</p> : null}
        </Container>
      )
    }
    case 'downloads': {
      if (!ctx.hasFeature('downloads')) return null
      const documents = await getDownloads(
        ctx.store.tenantId,
        block.documentType === 'all' ? null : block.documentType,
        block.limit ?? 6,
      )
      if (documents.length === 0) return null
      return (
        <Container className="my-14" key={key}>
          {block.heading ? <SectionHeading>{block.heading}</SectionHeading> : null}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) =>
              typeof doc.file === 'object' && doc.file?.url ? (
                <li key={doc.id}>
                  <a
                    className="flex items-center gap-3 rounded-card border border-line p-4 hover:border-ink/30"
                    href={mediaUrl(doc.file.url)}
                    rel="noopener"
                    target="_blank"
                  >
                    <FileIcon className="shrink-0 text-accent" />
                    <span className="text-sm font-semibold">{doc.title}</span>
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </Container>
      )
    }
    case 'dealerFinder':
      if (!ctx.hasFeature('dealer-locator')) return null
      return (
        <section className="my-14 bg-dark py-12 text-white" key={key}>
          <Container className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-semibold [text-transform:var(--heading-transform)]">
                {block.heading}
              </h2>
              {block.text ? <p className="mt-2 max-w-2xl text-white/80">{block.text}</p> : null}
            </div>
            <form action="/dealers" className="flex w-full max-w-md gap-2 md:w-auto">
              <label className="sr-only" htmlFor={`dealer-near-${key}`}>
                Your pincode or city
              </label>
              <input
                autoComplete="postal-code"
                className="h-11 min-w-0 flex-1 rounded-card border border-white/20 bg-white/10 px-3 text-white placeholder:text-white/60 md:w-48"
                id={`dealer-near-${key}`}
                name="near"
                placeholder="Your pincode or city"
              />
              <button className={buttonClass('primary')} type="submit">
                {block.buttonLabel ?? 'Find a dealer'}
              </button>
            </form>
          </Container>
        </section>
      )
    case 'enquiryForm':
      if (!ctx.hasFeature('enquiries')) return null
      return (
        <Container className="my-14 max-w-3xl" key={key}>
          {block.heading ? <SectionHeading>{block.heading}</SectionHeading> : null}
          {block.text ? <p className="mb-6 text-ink-soft">{block.text}</p> : null}
          <QuoteForm
            storeName={ctx.settings?.storeName ?? ctx.store.name}
            type={block.enquiryType ?? 'general'}
          />
        </Container>
      )
    case 'brandStory':
      return (
        <section className="my-14 bg-surface-alt py-14" key={key}>
          <Container className="grid items-center gap-10 md:grid-cols-2">
            <div>
              {block.heading ? <SectionHeading>{block.heading}</SectionHeading> : null}
              {block.text ? (
                <p className="leading-relaxed whitespace-pre-line text-ink-soft">{block.text}</p>
              ) : null}
              {block.stats?.length ? (
                <dl className="mt-8 grid grid-cols-3 gap-4">
                  {block.stats.map((stat, i) => (
                    <div className="flex flex-col" key={stat.id ?? i}>
                      <dt className="text-xs tracking-wide text-ink-soft uppercase">
                        {stat.label}
                      </dt>
                      <dd className="order-first font-heading text-3xl font-bold text-ink">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
            {block.image ? (
              <Img
                className="w-full rounded-card object-cover"
                media={block.image}
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            ) : null}
          </Container>
        </section>
      )
    // Growth blocks: each checks its own feature (GrowthBlocks.tsx)
    case 'offerStrip':
      return <OfferStrip block={block} ctx={ctx} key={key} />
    case 'schemeProducts':
      return <SchemeProducts block={block} ctx={ctx} key={key} />
    case 'couponList':
      return <CouponList block={block} ctx={ctx} key={key} />
    case 'reviews':
      return <StoreReviews block={block} ctx={ctx} key={key} />
    case 'offersSignup':
      return <OffersSignupSection block={block} ctx={ctx} key={key} />
    case 'affiliateInvite':
      return <AffiliateInvite block={block} ctx={ctx} key={key} />
    default:
      return null
  }
}
