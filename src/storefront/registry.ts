import type { VendorUI } from './types'

// Vendor UI resolution (docs/10). Static import() map so each vendor's code is split; add a
// line here when a vendor gets its own folder (docs/10 "New vendor checklist").
const vendors: Record<string, () => Promise<{ default: Partial<VendorUI> }>> = {
  default: () => import('./vendors/default'),
  'home-orbit': () => import('./vendors/home-orbit'),
}

export async function getVendorUI(slug: string): Promise<VendorUI> {
  const base = (await vendors.default!()).default as VendorUI
  const own = vendors[slug] && slug !== 'default' ? (await vendors[slug]()).default : {}
  return {
    ...base,
    ...own,
    theme: { ...base.theme, ...own.theme },
    blocks: { ...base.blocks, ...own.blocks },
  }
}
