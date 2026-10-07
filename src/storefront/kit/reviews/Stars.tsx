import { StarIcon } from '../icons'

/** A rating as five stars (filled to the nearest half) with the number for screen readers. */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span
      aria-label={`${value.toFixed(1)} out of 5`}
      className="inline-flex items-center"
      role="img"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          aria-hidden
          className={n <= Math.round(value) ? 'fill-[#E3A008] text-[#E3A008]' : 'text-line'}
          height={size}
          key={n}
          width={size}
        />
      ))}
    </span>
  )
}
