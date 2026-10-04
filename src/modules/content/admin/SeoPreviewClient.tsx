'use client'

import { useFormFields } from '@payloadcms/ui'

/** Google shows about this much before cutting a title or description off (docs/13). */
const TITLE_IDEAL = 60
const DESCRIPTION_MIN = 70
const DESCRIPTION_IDEAL = 160

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

function Meter({ length, ideal, min }: { length: number; ideal: number; min?: number }) {
  const state =
    length === 0 ? 'empty' : length > ideal ? 'long' : min && length < min ? 'short' : 'good'
  const message = {
    empty: 'Empty: the default is used',
    long: `${length - ideal} characters too long: Google will cut it off`,
    short: 'A little short: say what shoppers will find',
    good: 'Good length',
  }[state]
  return (
    <span className={`te-meter te-meter--${state}`}>
      {length} / {ideal} · {message}
    </span>
  )
}

/**
 * How the page will look as a Google result, live as staff type, with length guidance for the
 * title and description (the fields themselves sit below, unchanged).
 */
export function SeoPreviewClient({ origin, storeName }: { origin: string; storeName: string }) {
  const { title, slug, seoTitle, seoDescription } = useFormFields(([fields]) => ({
    title: text(fields.title?.value),
    slug: text(fields.slug?.value),
    seoTitle: text(fields['seo.title']?.value),
    seoDescription: text(fields['seo.description']?.value),
  }))
  const shownTitle = seoTitle || [title || 'Page title', storeName].filter(Boolean).join(' · ')
  const address = `${origin.replace(/\/$/, '')}${slug === 'home' ? '/' : `/pages/${slug || 'page-address'}`}`
  return (
    <section aria-label="Search result preview" className="te-seo-preview">
      <p className="te-seo-preview__label">Search result preview</p>
      <div className="te-seo-preview__result">
        <span className="te-seo-preview__url">{address}</span>
        <span className="te-seo-preview__title">
          {shownTitle.length > 70 ? `${shownTitle.slice(0, 67)}…` : shownTitle}
        </span>
        <span className="te-seo-preview__description">
          {seoDescription ||
            'Add a meta description: one or two sentences on what shoppers will find on this page.'}
        </span>
      </div>
      <div className="te-seo-preview__meters">
        <span>
          Title <Meter ideal={TITLE_IDEAL} length={seoTitle.length} />
        </span>
        <span>
          Description{' '}
          <Meter ideal={DESCRIPTION_IDEAL} length={seoDescription.length} min={DESCRIPTION_MIN} />
        </span>
      </div>
    </section>
  )
}
