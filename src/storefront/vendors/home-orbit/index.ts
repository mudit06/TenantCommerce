import type { VendorUI } from '../../types'
import { Hero } from './blocks/Hero'

/**
 * Home Orbit (vendor 1, onboarded 3 October 2026). Colours sampled from the logo: charcoal
 * #333333 and orange #F28432. Orange buttons carry charcoal text (6:1); orange text uses a
 * darker shade (#B4560F, 4.9:1 on white) so it stays readable (docs/10 UX rules, WCAG AA).
 */
const ui: Partial<VendorUI> = {
  tagline: 'Right choice for the home',
  theme: {
    brand: '#F28432',
    brandInk: '#1F1F1F',
    accent: '#B4560F',
    ink: '#2B2B2B',
    inkSoft: '#5A5A5A',
    line: '#E7E3DE',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F4F0',
    dark: '#333333',
    radius: '6px',
    fontHeading: "'Saira Variable', 'Plus Jakarta Sans Variable', system-ui, sans-serif",
    fontBody: "'Plus Jakarta Sans Variable', system-ui, sans-serif",
    headingTransform: 'uppercase',
  },
  blocks: { hero: Hero },
}

export default ui
