'use client'

import { useState, type ReactNode } from 'react'

/** Main photo with thumbnails; server-rendered images are passed in, so no data fetching here. */
export function Gallery({
  slides,
  thumbs,
  title,
}: {
  slides: ReactNode[]
  thumbs: ReactNode[]
  title: string
}) {
  const [active, setActive] = useState(0)
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-card border border-line bg-surface-alt">
        {slides[active]}
      </div>
      {thumbs.length > 1 ? (
        <ul aria-label={`${title} photos`} className="mt-3 flex gap-2 overflow-x-auto">
          {thumbs.map((thumb, index) => (
            <li key={index}>
              <button
                aria-current={index === active}
                aria-label={`Photo ${index + 1}`}
                className={`size-16 overflow-hidden rounded-card border-2 bg-surface-alt sm:size-20 ${index === active ? 'border-brand' : 'border-transparent'}`}
                onClick={() => setActive(index)}
                type="button"
              >
                {thumb}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
