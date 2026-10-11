'use client'

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { ChevronIcon } from './icons'

/**
 * A row of slides that scrolls sideways: the hero slider (one slide at a time, dots, autoplay)
 * and product or category carousels (several per screen, arrows). Without JavaScript it is still
 * a swipeable scroll-snap row. Autoplay pauses while the pointer or focus is inside, when the tab
 * is hidden, and never runs for visitors who ask for less motion (WCAG 2.2.2).
 */
export function Slider({
  children,
  label,
  itemClassName = 'w-full',
  gapClassName = '',
  autoplayMs = 0,
  dots = false,
  arrows = true,
  arrowsClassName = '',
}: {
  children: ReactNode
  label: string
  /** Width of each slide, for example `w-[46%] sm:w-[31%]` for a carousel */
  itemClassName?: string
  gapClassName?: string
  autoplayMs?: number
  dots?: boolean
  arrows?: boolean
  arrowsClassName?: string
}) {
  const slides = Children.toArray(children)
  const track = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const [ends, setEnds] = useState({ start: true, end: slides.length <= 1 })
  const paused = useRef(false)

  const measure = useCallback(() => {
    const el = track.current
    if (!el) return
    const items = Array.from(el.children) as HTMLElement[]
    const left = el.scrollLeft
    const distance = (item: HTMLElement) => Math.abs(item.offsetLeft - el.offsetLeft - left)
    let index = 0
    items.forEach((item, i) => {
      if (distance(item) < distance(items[index]!)) index = i
    })
    activeRef.current = index
    setActive(index)
    setEnds({ start: left <= 4, end: left + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  const goTo = useCallback((index: number) => {
    const el = track.current
    const item = el?.children[index] as HTMLElement | undefined
    if (!el || !item) return
    el.scrollTo({ left: item.offsetLeft - el.offsetLeft, behavior: 'smooth' })
  }, [])

  const page = (direction: 1 | -1) => {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = track.current
    if (!el) return
    measure()
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [measure])

  useEffect(() => {
    if (!autoplayMs || slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Slides start moving once the visitor has done something on the page, so the first screen
    // stays still while it loads (and for someone only reading it)
    const events = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    let timer = 0
    const begin = () => {
      events.forEach((name) => window.removeEventListener(name, begin))
      timer = window.setInterval(() => {
        if (paused.current || document.hidden) return
        goTo((activeRef.current + 1) % slides.length)
      }, autoplayMs)
    }
    events.forEach((name) => window.addEventListener(name, begin, { passive: true }))
    return () => {
      events.forEach((name) => window.removeEventListener(name, begin))
      window.clearInterval(timer)
    }
  }, [autoplayMs, slides.length, goTo])

  const pause = () => {
    paused.current = true
  }
  const resume = () => {
    paused.current = false
  }
  const showArrows = arrows && slides.length > 1 && !(ends.start && ends.end)

  return (
    <div
      aria-label={label}
      aria-roledescription="carousel"
      className="group/slider relative min-w-0"
      onBlur={resume}
      onFocus={pause}
      onPointerEnter={pause}
      onPointerLeave={resume}
      role="region"
    >
      <ul
        className={`flex snap-x snap-mandatory overflow-x-auto scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${gapClassName}`}
        ref={track}
      >
        {slides.map((slide, i) => (
          <li
            aria-label={`${i + 1} of ${slides.length}`}
            aria-roledescription="slide"
            className={`shrink-0 snap-start ${itemClassName}`}
            key={i}
          >
            {slide}
          </li>
        ))}
      </ul>
      {showArrows ? (
        <div className={arrowsClassName}>
          <button
            aria-label="Previous"
            className="absolute top-1/2 left-2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/95 text-ink shadow-md transition hover:bg-white disabled:opacity-0 md:flex"
            disabled={ends.start}
            onClick={() => page(-1)}
            type="button"
          >
            <ChevronIcon className="rotate-180" />
          </button>
          <button
            aria-label="Next"
            className="absolute top-1/2 right-2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/95 text-ink shadow-md transition hover:bg-white disabled:opacity-0 md:flex"
            disabled={ends.end}
            onClick={() => page(1)}
            type="button"
          >
            <ChevronIcon />
          </button>
        </div>
      ) : null}
      {dots && slides.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1">
          {slides.map((_, i) => (
            <button
              aria-current={i === active ? 'true' : undefined}
              aria-label={`Show slide ${i + 1} of ${slides.length}`}
              className="group/dot flex size-6 items-center justify-center"
              key={i}
              onClick={() => goTo(i)}
              type="button"
            >
              <span
                className={`block h-2 rounded-full transition-all ${i === active ? 'w-6 bg-ink' : 'w-2 bg-ink/25 group-hover/dot:bg-ink/50'}`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
