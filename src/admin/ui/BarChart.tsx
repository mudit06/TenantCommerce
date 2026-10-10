/**
 * A column chart (the dashboards' and Reports' sales and enquiry charts): one bar per day, the
 * last one highlighted when it is today. Server-rendered, no chart library; the figure's label
 * carries the numbers for screen readers.
 */
export function BarChart({
  bars,
  label,
  format = (value) => value.toLocaleString('en-IN'),
  xLabels,
  highlightLast = false,
  minTop = 4,
}: {
  bars: { key: string; title: string; value: number }[]
  label: string
  format?: (value: number) => string
  /** Start, middle and end labels under the axis */
  xLabels: [string, string, string]
  highlightLast?: boolean
  /** The smallest top of the scale, so a quiet fortnight doesn't look busy */
  minTop?: number
}) {
  const top = niceTop(Math.max(minTop, ...bars.map((bar) => bar.value)))
  return (
    <figure aria-label={label} className="te-chart" role="img">
      <div aria-hidden className="te-chart__y">
        <span>{format(top)}</span>
        <span>{format(Math.round(top / 2))}</span>
        <span>0</span>
      </div>
      <div aria-hidden className="te-chart__plot">
        {bars.map((bar, index) => (
          <div className="te-chart__col" key={bar.key} title={`${bar.title}: ${format(bar.value)}`}>
            <i
              className={
                highlightLast && index === bars.length - 1 ? 'te-chart__bar--today' : undefined
              }
              style={{ height: `${(bar.value / top) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption aria-hidden className="te-chart__x">
        {xLabels.map((text, index) => (
          <span key={index}>{text}</span>
        ))}
      </figcaption>
    </figure>
  )
}

/** Rounds a maximum up to 1, 2 or 5 times a power of ten, so the scale reads cleanly. */
function niceTop(max: number): number {
  if (max <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 5, 10].find((m) => m * power >= max) ?? 10
  return step * power
}
