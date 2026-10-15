'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ComponentProps, useRef } from 'react'

type Props = ComponentProps<typeof Link>

/**
 * `next/link` for the storefront: it prefetches when the shopper shows intent (pointer over it,
 * a touch, keyboard focus) instead of as soon as it scrolls into view. A category page has 60+
 * links (cards, filters, menus): prefetching them all downloaded 2.3 MB of product pages and kept
 * the server busy for about 2 s per visit, which slowed the next page a shopper opened (docs/13).
 * A touch starts the prefetch about 100 ms before the click lands. Pass `prefetch` to let Next
 * decide instead.
 */
export function IntentLink({ prefetch, onMouseEnter, onTouchStart, onFocus, ...props }: Props) {
  const router = useRouter()
  const done = useRef(false)
  const warm = () => {
    if (done.current || prefetch !== undefined || typeof props.href !== 'string') return
    done.current = true
    router.prefetch(props.href)
  }
  return (
    <Link
      {...props}
      onFocus={(event) => {
        warm()
        onFocus?.(event)
      }}
      onMouseEnter={(event) => {
        warm()
        onMouseEnter?.(event)
      }}
      onTouchStart={(event) => {
        warm()
        onTouchStart?.(event)
      }}
      prefetch={prefetch ?? false}
    />
  )
}

export default IntentLink
