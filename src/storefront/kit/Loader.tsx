/**
 * The store's loader: a small house with a dot circling it, drawn in the store's own colours
 * (--ink, --line, --brand). Inline SVG and a few lines of CSS (globals.css "Loaders"), no image or
 * library. The dot circles only when motion is allowed; otherwise it gently fades in and out.
 */
export function LoaderMark({ size = 48 }: { size?: number }) {
  return (
    <svg aria-hidden fill="none" height={size} viewBox="0 0 64 64" width={size}>
      <circle cx="32" cy="32" r="27" stroke="var(--line)" strokeWidth="2.5" />
      <path
        d="M20 32 32 22l12 10M23.5 29.5V43h17V29.5M29 43v-7h6v7"
        stroke="var(--ink)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <circle className="loader-orbit" cx="32" cy="5" fill="var(--brand)" r="4.5" />
    </svg>
  )
}

/** A loader with words under it, for a part of a page that is still loading. */
export function Loader({
  label = 'Loading…',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 text-sm text-ink-soft ${className}`}
      role="status"
    >
      <LoaderMark />
      <span>{label}</span>
    </div>
  )
}
