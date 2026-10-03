import type { BlockRendererProps } from '@/storefront/types'
import { linkHref } from '@/storefront/kit/links'
import { Img } from '@/storefront/kit/media'
import { ButtonLink, Container } from '@/storefront/kit/ui'

/**
 * Home Orbit's hero: charcoal panel with the orange rule from the catalogue pages. Their product
 * photos are shot on black, so the photo sits on the panel instead of filling it.
 */
export function Hero({ block, first }: BlockRendererProps<'hero'>) {
  const slide = block.slides?.[0]
  if (!slide) return null
  const target = linkHref(slide.buttonLink)
  const second = block.slides?.[1]
  const secondTarget = linkHref(second?.buttonLink)
  return (
    <section className="relative overflow-hidden bg-dark text-white">
      <div aria-hidden className="absolute inset-y-0 left-0 w-2 bg-brand" />
      <Container className="grid items-center gap-8 py-10 md:grid-cols-[1.05fr_1fr] md:py-16">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-brand uppercase">
            Premium quality · Durable finish · Modern design
          </p>
          <h1 className="mt-4 font-heading text-4xl leading-[1.05] font-bold uppercase sm:text-5xl lg:text-6xl">
            {slide.heading}
          </h1>
          {slide.subheading ? (
            <p className="mt-4 max-w-lg text-base text-white/80 sm:text-lg">{slide.subheading}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            {target && slide.buttonLabel ? (
              <ButtonLink href={target.href} newTab={target.newTab}>
                {slide.buttonLabel}
              </ButtonLink>
            ) : null}
            {secondTarget && second?.buttonLabel ? (
              <ButtonLink href={secondTarget.href} style="onDark">
                {second.buttonLabel}
              </ButtonLink>
            ) : null}
          </div>
        </div>
        <div className="relative">
          <Img
            className="w-full rounded-card object-contain shadow-2xl"
            media={slide.image}
            priority={first}
            sizes="(min-width: 1280px) 600px, (min-width: 768px) 45vw, calc(100vw - 32px)"
          />
          {second?.image ? (
            <Img
              className="absolute -bottom-6 -left-6 hidden aspect-square w-1/3 rounded-card border-4 border-dark object-cover shadow-xl sm:block"
              media={second.image}
              sizes="20vw"
            />
          ) : null}
        </div>
      </Container>
    </section>
  )
}
