import type { ComponentType } from 'react'

import type { Page } from '@/payload-types'

import type { StoreContext } from './context'

// The vendor UI contract (docs/10 "Resolution"). Each vendor folder exports a Partial<VendorUI>;
// whatever it leaves out comes from vendors/default (the shared kit).

export type VendorTheme = {
  /** Brand colour for buttons, highlights and bars */
  brand: string
  /** Text on the brand colour (must reach 4.5:1 contrast) */
  brandInk: string
  /** Brand-coloured text on white (darker than `brand` when needed for contrast) */
  accent: string
  ink: string
  inkSoft: string
  line: string
  surface: string
  surfaceAlt: string
  /** Footer and top bar */
  dark: string
  radius: string
  fontHeading: string
  fontBody: string
  headingTransform: 'none' | 'uppercase'
}

type Block = NonNullable<Page['layout']>[number]
export type BlockType = Block['blockType']
export type BlockRendererProps<K extends BlockType> = {
  block: Extract<Block, { blockType: K }>
  ctx: StoreContext
  /** The first block on the page: load its images eagerly (LCP) */
  first: boolean
}
export type BlockRenderers = Partial<{ [K in BlockType]: ComponentType<BlockRendererProps<K>> }>

export type VendorUI = {
  theme: VendorTheme
  /** Short line under the logo and in the default hero */
  tagline?: string
  /** Own renderers for some CMS blocks (docs/10 "Adding a block", step 3); others use the kit */
  blocks: BlockRenderers
}
