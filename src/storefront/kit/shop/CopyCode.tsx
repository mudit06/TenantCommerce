'use client'

import { useState } from 'react'

import { buttonClass } from '../ui'

/** "Copy" next to a public coupon code on the Offers page. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={buttonClass('outline', 'min-h-9 px-3')}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2000)
        } catch {
          setCopied(false)
        }
      }}
      type="button"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
