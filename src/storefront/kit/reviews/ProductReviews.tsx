import type { PublicReview } from '@/lib/data/catalog'

import { mediaUrl } from '../media'
import { SectionHeading } from '../ui'
import { Stars } from './Stars'

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

function ReviewItem({ review }: { review: PublicReview }) {
  return (
    <li className="space-y-1.5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.rating} />
        {review.title ? <b className="text-sm">{review.title}</b> : null}
      </div>
      <p className="text-xs text-ink-soft">
        {review.displayName} · {day(review.at)}
        {review.variantLabel ? ` · ${review.variantLabel}` : ''} ·{' '}
        <span className="font-semibold text-[#1F7A3E]">Verified purchase</span>
      </p>
      {review.body ? <p className="text-sm whitespace-pre-line">{review.body}</p> : null}
      {review.photos.length ? (
        <div className="flex gap-2">
          {review.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element -- shoppers' photos, already resized
            <img
              alt={photo.alt}
              className="size-20 rounded-md border border-line object-cover"
              key={photo.url}
              loading="lazy"
              src={mediaUrl(photo.url) ?? photo.url}
            />
          ))}
        </div>
      ) : null}
      {review.reply ? (
        <p className="rounded-card bg-surface-alt p-3 text-sm">
          <b>Reply from the store:</b> {review.reply}
        </p>
      ) : null}
    </li>
  )
}

/**
 * Ratings and reviews on the product page (docs/screens storefront `st-product` rule 11):
 * published reviews from buyers only; the average, count and bars come from the same reviews.
 */
export function ProductReviews({
  average,
  count,
  bars,
  reviews,
}: {
  average: number
  count: number
  bars: { stars: number; count: number }[]
  reviews: PublicReview[]
}) {
  const first = reviews.slice(0, 6)
  const rest = reviews.slice(6)
  return (
    <section aria-labelledby="reviews-heading" className="mt-12" id="reviews">
      <SectionHeading>
        <span id="reviews-heading">Ratings and reviews</span>
      </SectionHeading>
      <div className="grid gap-8 md:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-3">
          <p className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{average.toFixed(1)}</span>
            <span className="text-sm text-ink-soft">out of 5</span>
          </p>
          <Stars size={18} value={average} />
          <p className="text-sm text-ink-soft">
            {count} review{count === 1 ? '' : 's'} from buyers
          </p>
          <ul className="space-y-1.5 text-sm">
            {bars.map((bar) => {
              const share = count ? Math.round((bar.count / count) * 100) : 0
              return (
                <li className="flex items-center gap-2" key={bar.stars}>
                  <span className="w-3">{bar.stars}</span>
                  <span
                    aria-hidden
                    className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt"
                  >
                    <span className="block h-full bg-[#E3A008]" style={{ width: `${share}%` }} />
                  </span>
                  <span className="w-10 text-right text-ink-soft">{share}%</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div>
          <ul className="divide-y divide-line">
            {first.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
          {rest.length ? (
            <details className="border-t border-line">
              <summary className="cursor-pointer py-3 text-sm font-semibold underline">
                See all {count}
              </summary>
              <ul className="divide-y divide-line">
                {rest.map((review) => (
                  <ReviewItem key={review.id} review={review} />
                ))}
              </ul>
            </details>
          ) : null}
          <p className="mt-3 text-xs text-ink-soft">
            Only buyers who received this product can review it. The store replies but never edits
            reviews.
          </p>
        </div>
      </div>
    </section>
  )
}
