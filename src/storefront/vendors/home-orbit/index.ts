import type { VendorUI } from '../../types'
import { Hero } from './blocks/Hero'
import { Header } from './layout/Header'

/**
 * Home Orbit (vendor 1, onboarded 3 October 2026). Colours sampled from the logo: charcoal
 * #333333 and orange #F28432. Orange buttons carry charcoal text (6:1); orange text uses a
 * darker shade (#B4560F, 4.9:1 on white) so it stays readable (docs/10 UX rules, WCAG AA).
 *
 * Look (10 October 2026, mudit): a clean, rounded shop in the manner of the Porto "shop51" theme:
 * light utility line, wide search, a category bar with large dropdowns, sentence-case headings,
 * soft warm surfaces. Content and layout of every section stay in the CMS.
 */
const ui: Partial<VendorUI> = {
  tagline: 'Right choice for the home',
  theme: {
    brand: '#F28432',
    brandInk: '#1F1F1F',
    accent: '#B4560F',
    ink: '#2B2B2B',
    inkSoft: '#5A5A5A',
    line: '#ECE7E1',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F3EE',
    dark: '#2E2E2E',
    radius: '12px',
    fontHeading: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
    fontBody: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
    headingTransform: 'none',
  },
  Header,
  blocks: { hero: Hero },
}

export default ui
