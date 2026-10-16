'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const OPEN_SHEETS = 'details[data-sheet][open]'

/**
 * Closes the store's menus and sheets (`<details data-sheet>`: the phone menu, the filter sheet,
 * the sort menu) with Escape, putting the focus back on the button that opened them, and when
 * the shopper moves to another page (docs/10 UX rules: menus close with Escape). Renders nothing.
 */
export function SheetDismiss() {
  const pathname = usePathname()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const open = [...document.querySelectorAll<HTMLDetailsElement>(OPEN_SHEETS)]
      if (open.length === 0) return
      // The innermost one first, as a dialog would
      const sheet = open[open.length - 1]!
      sheet.open = false
      sheet.querySelector('summary')?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    for (const sheet of document.querySelectorAll<HTMLDetailsElement>(OPEN_SHEETS)) {
      sheet.open = false
    }
  }, [pathname])

  return null
}
