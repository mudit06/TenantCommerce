/**
 * "Showing 1–50 of 214" with Previous and Next, for our own list screens. Links keep every other
 * query parameter (tab, search, filters).
 */
export function Pager({
  base,
  params,
  page,
  pageSize,
  total,
}: {
  base: string
  params: URLSearchParams
  page: number
  pageSize: number
  total: number
}) {
  if (total === 0) return null
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const href = (n: number) => {
    const next = new URLSearchParams(params)
    if (n === 1) next.delete('page')
    else next.set('page', String(n))
    const query = next.toString()
    return query ? `${base}?${query}` : base
  }
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <nav aria-label="Pages" className="te-pager te-pager--split">
      <span className="te-muted te-small">
        Showing {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of{' '}
        {total.toLocaleString('en-IN')}
      </span>
      <span className="te-pager__buttons">
        {page > 1 ? (
          <a className="te-button te-button--secondary te-button--small" href={href(page - 1)}>
            Previous
          </a>
        ) : (
          <span
            aria-disabled
            className="te-button te-button--secondary te-button--small"
            data-disabled
          >
            Previous
          </span>
        )}
        {page < pages ? (
          <a className="te-button te-button--secondary te-button--small" href={href(page + 1)}>
            Next
          </a>
        ) : (
          <span
            aria-disabled
            className="te-button te-button--secondary te-button--small"
            data-disabled
          >
            Next
          </span>
        )}
      </span>
    </nav>
  )
}
