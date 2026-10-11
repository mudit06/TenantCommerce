import type { BlockRendererProps } from '@/storefront/types'
import { linkHref } from '@/storefront/kit/links'
import { Img, mediaUrl } from '@/storefront/kit/media'
import { Slider } from '@/storefront/kit/Slider'
import { ButtonLink, Container } from '@/storefront/kit/ui'

/**
 * Home Orbit's hero slider: rounded charcoal panels with the orange rule from the catalogue
 * pages, the words on the left and the photo on the right (their photos are shot on dark
 * backgrounds). Slides, autoplay and the phone image come from the CMS hero block.
 */
export function Hero({ block, first, h1 }: BlockRendererProps<'hero'>) {
  const slides = block.slides ?? []
  if (slides.length === 0) return null
  return (
    <Container className="mt-4 sm:mt-6">
      <Slider autoplayMs={block.autoplay ? 6000 : 0} dots label="Highlights">
        {slides.map((slide, i) => {
          const target = linkHref(slide.buttonLink)
          const Heading = h1 && i === 0 ? 'h1' : 'h2'
          return (
            <div
              className="relative grid h-full overflow-hidden rounded-card bg-dark text-white md:min-h-[440px] md:grid-cols-[1.05fr_1fr]"
              key={slide.id ?? i}
            >
              <div aria-hidden className="absolute inset-y-0 left-0 z-10 w-1.5 bg-brand" />
              <div className="order-2 flex flex-col justify-center p-6 sm:p-10 md:order-1 lg:p-14">
                {slide.eyebrow ? (
                  <p className="text-xs font-semibold tracking-[0.22em] text-brand uppercase">
                    {slide.eyebrow}
                  </p>
                ) : null}
                <Heading className="mt-3 font-heading text-3xl leading-[1.08] font-bold [text-transform:var(--heading-transform)] sm:text-4xl lg:text-5xl">
                  {slide.heading}
                </Heading>
                {slide.subheading ? (
                  <p className="mt-4 max-w-lg text-base text-white/80 sm:text-lg">
                    {slide.subheading}
                  </p>
                ) : null}
                {target && slide.buttonLabel ? (
                  <ButtonLink className="mt-7 self-start" href={target.href} newTab={target.newTab}>
                    {slide.buttonLabel}
                  </ButtonLink>
                ) : null}
              </div>
              <div className="relative order-1 aspect-[16/10] md:order-2 md:aspect-auto">
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
                    className="absolute inset-0 size-full object-cover"
                    media={slide.image}
                    priority={first && i === 0}
                    sizes="(min-width: 1280px) 620px, (min-width: 768px) 48vw, calc(100vw - 32px)"
                  />
                </picture>
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-dark/60 to-transparent md:bg-gradient-to-r md:from-dark md:via-dark/10 md:to-transparent"
                />
              </div>
            </div>
          )
        })}
      </Slider>
    </Container>
  )
}
