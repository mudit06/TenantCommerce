import type { IconName } from '@/admin/ui/icons'

// How each block appears in the page builder: its group in the "Add block" library, icon,
// a one-line description and which field names a row (docs/screens Page builder). Display only:
// the block's data shape lives in ./index.ts.

export const BLOCK_GROUPS = {
  marketing: 'Marketing',
  commerce: 'Commerce',
  basic: 'Basic',
  utility: 'Utility',
} as const

export type BlockGroup = keyof typeof BLOCK_GROUPS

export type BlockMeta = {
  /** Short name on the canvas row (the library shows the block's own label) */
  label: string
  group: BlockGroup
  icon: IconName
  description: string
  /** The field that best names a block row, for example the first slide's heading */
  summary: (data: Record<string, unknown>) => string | undefined
}

const field = (name: string) => (data: Record<string, unknown>) =>
  typeof data[name] === 'string' ? (data[name] as string) : undefined

const firstOf = (list: string, name: string) => (data: Record<string, unknown>) => {
  const rows = data[list]
  const first = Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined) : undefined
  return typeof first?.[name] === 'string' ? (first[name] as string) : undefined
}

const count = (list: string, singular: string) => (data: Record<string, unknown>) => {
  const rows = data[list]
  const n = Array.isArray(rows) ? rows.length : 0
  return n ? `${n} ${singular}${n === 1 ? '' : 's'}` : undefined
}

export const BLOCK_META: Record<string, BlockMeta> = {
  hero: {
    label: 'Hero slider',
    group: 'marketing',
    icon: 'media',
    description: 'Big sliding pictures with a heading and a button, at the top of the page',
    summary: firstOf('slides', 'heading'),
  },
  banner: {
    label: 'Banner',
    group: 'marketing',
    icon: 'banners',
    description: 'One wide picture that links to a range, offer or category',
    summary: field('heading'),
  },
  brandStory: {
    label: 'Brand story',
    group: 'marketing',
    icon: 'sparkle',
    description: 'Your story with a few numbers, like years in business or dealers',
    summary: field('heading'),
  },
  testimonials: {
    label: 'Testimonials',
    group: 'marketing',
    icon: 'staff',
    description: 'Quotes from real customers and partners',
    summary: (data) => field('heading')(data) ?? count('items', 'quote')(data),
  },
  benefits: {
    label: 'Benefits strip',
    group: 'marketing',
    icon: 'checkCircle',
    description: 'A strip of short promises: delivery, warranty, certified',
    summary: (data) => firstOf('items', 'text')(data),
  },
  productGrid: {
    label: 'Products',
    group: 'commerce',
    icon: 'products',
    description: 'Products in a grid or carousel: featured, newest, bestsellers or a category',
    summary: field('heading'),
  },
  categoryTiles: {
    label: 'Category tiles',
    group: 'commerce',
    icon: 'categories',
    description: 'Tiles or round icons that open your categories',
    summary: (data) => field('heading')(data) ?? count('categories', 'category')(data),
  },
  downloads: {
    label: 'Downloads',
    group: 'commerce',
    icon: 'documents',
    description: 'Catalogues, brochures and price lists to download',
    summary: field('heading'),
  },
  richText: {
    label: 'Text',
    group: 'basic',
    icon: 'pages',
    description: 'Headings, paragraphs, lists and links',
    summary: () => undefined,
  },
  imageText: {
    label: 'Image and text',
    group: 'basic',
    icon: 'layout',
    description: 'A picture beside text, with an optional button',
    summary: field('heading'),
  },
  video: {
    label: 'Video',
    group: 'basic',
    icon: 'eye',
    description: 'A YouTube video with a heading and caption',
    summary: field('heading'),
  },
  faq: {
    label: 'FAQ',
    group: 'utility',
    icon: 'info',
    description: 'Questions and answers that open one at a time',
    summary: (data) => field('heading')(data) ?? count('items', 'question')(data),
  },
  dealerFinder: {
    label: 'Dealer finder',
    group: 'utility',
    icon: 'dealers',
    description: 'A search box that sends shoppers to your dealer locator',
    summary: field('heading'),
  },
  enquiryForm: {
    label: 'Enquiry form',
    group: 'utility',
    icon: 'enquiries',
    description: 'A short form that lands in your Enquiries inbox',
    summary: field('heading'),
  },
}

/** Thumbnail shown in the "Add block" library (public/block-thumbnails, 3:2). */
export const blockThumbnail = (slug: string) => `/block-thumbnails/${slug}.svg`
