'use client'

import type { ReactNode } from 'react'

/** Closes the filter sheet (a `<details>`) it sits in: "Show 14 products" and Close. */
export function SheetClose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button
      className={className}
      onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
      type="button"
    >
      {children}
    </button>
  )
}
