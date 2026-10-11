import Link from 'next/link'

import { getCategoryTree, getProductList, withDescendants } from '@/lib/data/catalog'
import type { BenefitsBlock, CategoryTilesBlock, ProductGridBlock } from '@/payload-types'

import type { StoreContext } from '../../context'
import { BENEFIT_ICONS } from '../icons'
import { categoryHref, linkHref } from '../links'
import { Img } from '../media'
import { ProductCard, ProductGrid } from '../product/ProductCard'
import { Slider } from '../Slider'
import { ButtonLink, Container, SectionHeading, ViewAllLink } from '../ui'

// The commerce blocks every vendor shares (docs/10 "CMS blocks"): product grid, carousel and
// promo row; category tiles, circles and cards; the benefits strip and its scrolling line. The
// layout is the vendor's choice in the page builder; colours and fonts come from the theme.

const CAROUSEL_ITEM = 'w-[46%] sm:w-[31%] lg:w-[23.5%]'

/** Products of a product grid block: featured, newest, bestsellers or a category (with its children). */
export async function ProductSection({
  block,
  ctx,
}: {
  block: ProductGridBlock
  ctx: StoreContext
}) {
  const { all } = await getCategoryTree(ctx.store.tenantId)
  const categoryId = typeof block.category === 'object' ? block.category?.id : block.category
  const category = all.find((node) => String(node.id) === String(categoryId))
  const products = await getProductList(
    ctx.store.tenantId,
    block.source,
    block.limit ?? 8,
    category ? withDescendants(category) : undefined,
  )
  if (products.length === 0) return null
  const heading = (
    <SectionHeading
      action={category ? <ViewAllLink href={category.path} /> : null}
      eyebrow={block.eyebrow}
    >
      {block.heading ?? 'Products'}
    </SectionHeading>
  )
  const cards = products.map((product) => <ProductCard key={product.id} product={product} />)

  if (block.layout === 'promo') {
    const promo = block.promo
    const target = linkHref(promo?.buttonLink)
    return (
      <Container className="my-14">
        {heading}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <div className="relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-card bg-dark p-6 text-white lg:min-h-0">
            {promo?.image ? (
              <Img
                className="absolute inset-0 -z-10 size-full object-cover"
                media={promo.image}
                sizes="(min-width: 1024px) 25vw, 100vw"
              />
            ) : null}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
            />
            {promo?.eyebrow ? <p className="text-sm text-white/85">{promo.eyebrow}</p> : null}
            {promo?.heading ? (
              <p className="mt-1 font-heading text-2xl leading-tight font-bold [text-transform:var(--heading-transform)]">
                {promo.heading}
              </p>
            ) : null}
            {target && promo?.buttonLabel ? (
              <ButtonLink className="mt-5 self-start" href={target.href} newTab={target.newTab}>
                {promo.buttonLabel}
              </ButtonLink>
            ) : null}
          </div>
          <Slider
            gapClassName="gap-3 sm:gap-5"
            itemClassName="w-[46%] sm:w-[31%] lg:w-[31.5%] xl:w-[23.5%]"
            label={block.heading ?? 'Products'}
          >
            {cards}
          </Slider>
        </div>
      </Container>
    )
  }

  return (
    <Container className="my-12">
      {heading}
      {block.layout === 'carousel' ? (
        <Slider
          gapClassName="gap-3 sm:gap-5"
          itemClassName={CAROUSEL_ITEM}
          label={block.heading ?? 'Products'}
        >
          {cards}
        </Slider>
      ) : (
        <ProductGrid products={products} />
      )}
    </Container>
  )
}

/** Category tiles: image tiles, round icons, or square cards in a sideways row. */
export function CategorySection({ block }: { block: CategoryTilesBlock }) {
  const categories = (block.categories ?? []).filter(
    (c): c is Exclude<typeof c, string> => typeof c === 'object' && c !== null,
  )
  if (categories.length === 0) return null
  const heading =
    block.heading || block.eyebrow ? (
      <SectionHeading
        action={block.showViewAll ? <ViewAllLink href="/c" /> : null}
        eyebrow={block.eyebrow}
      >
        {block.heading}
      </SectionHeading>
    ) : null

  if (block.style === 'cards') {
    return (
      <Container className="my-12">
        {heading}
        <Slider
          gapClassName="gap-3 sm:gap-4"
          itemClassName="w-[30%] sm:w-[22%] md:w-[17%] lg:w-[13.5%] xl:w-[11.6%]"
          label={block.heading ?? 'Categories'}
        >
          {categories.map((category) => (
            <Link
              className="group block rounded-card focus-visible:outline-2 focus-visible:outline-ink"
              href={categoryHref(category)}
              key={category.id}
            >
              <div className="aspect-square rounded-card border border-line bg-white p-3 transition group-hover:border-ink/25 group-hover:shadow-md sm:p-4">
                <div className="size-full overflow-hidden rounded-[calc(var(--radius)*0.6)] bg-surface-alt">
                  <Img
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                    media={category.image}
                    sizes="(min-width: 1024px) 140px, 30vw"
                  />
                </div>
              </div>
              <p className="mt-2 text-center text-sm leading-snug font-semibold text-ink group-hover:text-accent">
                {category.name}
              </p>
            </Link>
          ))}
        </Slider>
      </Container>
    )
  }

  const circles = block.style === 'circles'
  return (
    <Container className="my-12">
      {heading}
      <ul
        className={`grid gap-3 sm:gap-5 ${circles ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}
      >
        {categories.map((category) => (
          <li key={category.id}>
            <Link className="group block" href={categoryHref(category)}>
              <div
                className={`overflow-hidden bg-surface-alt ${circles ? 'aspect-square rounded-full' : 'aspect-[4/3] rounded-card'}`}
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
        ))}
      </ul>
    </Container>
  )
}

/** Benefits: icons in a row, or one line that scrolls (still for visitors who reduce motion). */
export function BenefitsSection({ block }: { block: BenefitsBlock }) {
  const items = (block.items ?? []).map((item, i) => ({
    key: item.id ?? String(i),
    text: item.text,
    Icon:
      BENEFIT_ICONS[(item.icon ?? 'check') as keyof typeof BENEFIT_ICONS] ?? BENEFIT_ICONS.check,
  }))
  if (items.length === 0) return null

  if (block.style === 'marquee') {
    const row = (copy: number) =>
      items.map(({ key, text, Icon }) => (
        <li
          aria-hidden={copy > 0 ? true : undefined}
          className={`flex shrink-0 items-center gap-3 px-6 font-heading ${copy > 0 ? 'motion-reduce:hidden' : ''} text-lg font-semibold whitespace-nowrap [text-transform:var(--heading-transform)] sm:text-2xl`}
          key={`${copy}-${key}`}
        >
          <Icon aria-hidden className="text-brand" />
          {text}
        </li>
      ))
    return (
      <section aria-label="Highlights" className="my-12 overflow-hidden border-y border-line py-5">
        <ul className="marquee flex w-max motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center">
          {row(0)}
          {row(1)}
        </ul>
      </section>
    )
  }

  return (
    <section className="my-10 border-y border-line bg-surface-alt">
      <Container>
        <ul className="grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
          {items.map(({ key, text, Icon }) => (
            <li className="flex items-center gap-3 text-sm font-semibold text-ink" key={key}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink">
                <Icon />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
