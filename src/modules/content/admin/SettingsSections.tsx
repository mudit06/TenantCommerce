'use client'

const SECTIONS = [
  'Branding',
  'Contact',
  'Grievance officer and labels',
  'GST and invoices',
  'Checkout and returns',
  'Announcement bar',
  'Policies',
  'Search and analytics',
  'Store status',
]

/**
 * The links above Store settings (docs/screens `cms-settings`): one page of sections, and a jump
 * to each. Finds the section by its heading, so a renamed section only needs this list changed.
 */
export function SettingsSections() {
  const jump = (label: string) => {
    const header = [
      ...document.querySelectorAll('.collapsible__header, .collapsible__toggle-wrap'),
    ].find((el) => el.textContent?.replace('Toggle block', '').trim().startsWith(label))
    const section = header?.closest('.collapsible') ?? header
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <nav aria-label="Settings sections" className="te-section-nav">
      {SECTIONS.map((label) => (
        <button
          className="te-section-nav__link"
          key={label}
          onClick={() => jump(label)}
          type="button"
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
