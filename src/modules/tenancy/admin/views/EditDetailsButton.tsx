'use client'

import { useEffect, useState } from 'react'

/**
 * Shows or hides the vendor form's detail fields (the `te-vendor-edit` sections) under the
 * read-only Business details card. A field with an error opens them so it can't stay hidden.
 */
export function EditDetailsButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // The sections show through CSS on this button's aria-expanded (_base.scss), not a class
    // set on Payload's form, which React owns and can re-render away (QA SAP-02-22)
    if (open) document.querySelector('.te-vendor-edit')?.scrollIntoView({ behavior: 'smooth' })
  }, [open])

  useEffect(() => {
    // Payload marks invalid fields after a failed save; open the sections so they show
    const observer = new MutationObserver(() => {
      if (document.querySelector('.te-vendor-edit .error')) setOpen(true)
    })
    const form = document.querySelector('.collection-edit')
    if (form)
      observer.observe(form, { subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <button
      aria-expanded={open}
      className="btn btn--style-secondary btn--size-small te-btn te-vendor-edit-toggle"
      onClick={() => setOpen((value) => !value)}
      type="button"
    >
      {open ? 'Done' : 'Edit'}
    </button>
  )
}
