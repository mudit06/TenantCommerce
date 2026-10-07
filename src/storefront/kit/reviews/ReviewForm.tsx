'use client'

import { useState, useTransition } from 'react'

import { sendReview } from '@/storefront/shop/reviewActions'

import { StarIcon } from '../icons'
import { buttonClass } from '../ui'

const WORDS = ['', 'Poor', 'Fair', 'Okay', 'Good', 'Excellent']

/** Downsizes a photo in the browser before upload (the server re-encodes it again). */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    return blob
      ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
      : file
  } catch {
    return file
  }
}

/** One item's review (docs/screens storefront `st-review`): stars required, the rest optional. */
export function ReviewForm({
  token,
  orderItemId,
  names,
  allowPhotos,
  source,
}: {
  token: string
  orderItemId: string
  names: string[]
  allowPhotos: boolean
  source: 'account' | 'review-email'
}) {
  const [rating, setRating] = useState(0)
  const [photos, setPhotos] = useState<File[]>([])
  const [done, setDone] = useState<null | { published: boolean }>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (done) {
    return (
      <p className="rounded-card bg-surface-alt p-4 text-sm" role="status">
        Thank you.{' '}
        {done.published
          ? 'Your review is on the product page now.'
          : 'We check reviews before they appear, usually within two days.'}
      </p>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!rating) {
          setError('Choose your rating.')
          return
        }
        const form = new FormData(event.currentTarget)
        form.set('rating', String(rating))
        form.delete('photos')
        start(async () => {
          setError(null)
          for (const photo of photos) form.append('photos', await shrink(photo))
          const result = await sendReview(form)
          if (!result.ok) setError(result.message)
          else setDone(result.data)
        })
      }}
    >
      <input name="token" type="hidden" value={token} />
      <input name="orderItemId" type="hidden" value={orderItemId} />
      <input name="source" type="hidden" value={source} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">
          Your rating <span className="text-red-700">*</span>
        </legend>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              aria-pressed={rating === n}
              className={`flex size-11 items-center justify-center rounded-card border ${n <= rating ? 'border-ink bg-surface-alt' : 'border-line'}`}
              key={n}
              onClick={() => setRating(n)}
              type="button"
            >
              <StarIcon
                aria-hidden
                className={n <= rating ? 'fill-[#E3A008] text-[#E3A008]' : 'text-ink-soft'}
                height={20}
                width={20}
              />
            </button>
          ))}
          {rating ? (
            <span className="ml-2 text-sm">
              {rating} of 5 · {WORDS[rating]}
            </span>
          ) : null}
        </div>
      </fieldset>
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor={`title-${orderItemId}`}>
          Title
        </label>
        <input
          className="h-11 w-full rounded-card border border-line px-3"
          id={`title-${orderItemId}`}
          maxLength={100}
          name="title"
          placeholder="Looks premium, easy to fit"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor={`body-${orderItemId}`}>
          Your review
        </label>
        <textarea
          className="w-full rounded-card border border-line p-3"
          id={`body-${orderItemId}`}
          maxLength={3000}
          name="body"
          rows={4}
        />
      </div>
      {allowPhotos ? (
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor={`photos-${orderItemId}`}>
            Photos
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
            id={`photos-${orderItemId}`}
            multiple
            onChange={(event) => setPhotos(Array.from(event.target.files ?? []).slice(0, 4))}
            type="file"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Up to 4 photos. Location details are removed.
          </p>
        </div>
      ) : null}
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor={`name-${orderItemId}`}>
          Show my name as
        </label>
        <select
          className="h-11 w-full rounded-card border border-line px-3"
          id={`name-${orderItemId}`}
          name="displayName"
        >
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-soft">Your email and phone are never shown.</p>
      </div>
      {error ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button className={buttonClass('dark')} disabled={pending} type="submit">
        {pending ? 'Sending…' : 'Submit review'}
      </button>
    </form>
  )
}
