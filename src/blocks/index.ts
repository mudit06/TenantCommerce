import type { Block } from 'payload'

import { linkField } from '@/fields/link'

import { BLOCK_GROUPS, BLOCK_META, blockThumbnail, type BlockGroup } from './meta'

// CMS blocks: data shape only (docs/10). Each vendor's storefront code decides how a block looks;
// the shape is the same for every vendor. Blocks of optional features (offer strip, scheme
// products, coupon list, reviews, offers sign-up, affiliate invite) are offered only while their
// feature is on (BLOCK_FEATURE, docs/screens Page builder rule 5).

const YOUTUBE =
  /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]{6,}/

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Hero slider', plural: 'Hero sliders' },
  fields: [
    {
      name: 'slides',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      required: true,
      fields: [
        {
          name: 'image',
          label: 'Desktop image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'mobileImage',
          label: 'Phone image',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'A separate, smaller image keeps the first screen fast on phones' },
        },
        { name: 'heading', type: 'text', required: true },
        { name: 'subheading', type: 'text' },
        { name: 'buttonLabel', label: 'Button text', type: 'text' },
        linkField({ name: 'buttonLink', label: 'Button goes to' }),
      ],
    },
    { name: 'autoplay', label: 'Autoplay every 6 seconds', type: 'checkbox', defaultValue: true },
  ],
}

export const BannerBlock: Block = {
  slug: 'banner',
  interfaceName: 'BannerBlock',
  labels: { singular: 'Banner', plural: 'Banners' },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'mobileImage', label: 'Phone image', type: 'upload', relationTo: 'media' },
    { name: 'heading', type: 'text' },
    linkField(),
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'full',
      options: [
        { label: 'Full width', value: 'full' },
        { label: 'Split with text', value: 'split' },
      ],
    },
  ],
}

export const ProductGridBlock: Block = {
  slug: 'productGrid',
  interfaceName: 'ProductGridBlock',
  labels: { singular: 'Product grid or carousel', plural: 'Product grids' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'source',
      label: 'Show',
      type: 'select',
      required: true,
      defaultValue: 'featured',
      options: [
        { label: 'Featured products', value: 'featured' },
        { label: 'Newest products', value: 'newest' },
        { label: 'Bestsellers (last 30 days)', value: 'bestsellers' },
        { label: 'Products in a category', value: 'category' },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: { condition: (_, sibling) => sibling?.source === 'category' },
    },
    { name: 'limit', label: 'How many', type: 'number', defaultValue: 8, min: 2, max: 24 },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
      ],
    },
  ],
}

export const CategoryTilesBlock: Block = {
  slug: 'categoryTiles',
  interfaceName: 'CategoryTilesBlock',
  labels: { singular: 'Category tiles', plural: 'Category tiles' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      required: true,
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'tiles',
      options: [
        { label: 'Image tiles', value: 'tiles' },
        { label: 'Round icons', value: 'circles' },
      ],
    },
  ],
}

export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  labels: { singular: 'Text', plural: 'Text' },
  fields: [{ name: 'content', type: 'richText', required: true }],
}

export const ImageTextBlock: Block = {
  slug: 'imageText',
  interfaceName: 'ImageTextBlock',
  labels: { singular: 'Image and text', plural: 'Image and text' },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'heading', type: 'text' },
    { name: 'text', type: 'richText' },
    {
      name: 'imageSide',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Image on the left', value: 'left' },
        { label: 'Image on the right', value: 'right' },
      ],
    },
    { name: 'buttonLabel', label: 'Button text', type: 'text' },
    linkField({ name: 'buttonLink', label: 'Button goes to' }),
  ],
}

export const BenefitsBlock: Block = {
  slug: 'benefits',
  interfaceName: 'BenefitsBlock',
  labels: { singular: 'Benefits strip', plural: 'Benefits strips' },
  fields: [
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      fields: [
        {
          name: 'icon',
          type: 'select',
          defaultValue: 'check',
          options: [
            { label: 'Delivery', value: 'truck' },
            { label: 'Warranty', value: 'shield' },
            { label: 'Certified', value: 'badge' },
            { label: 'Returns', value: 'return' },
            { label: 'Support', value: 'phone' },
            { label: 'Tick', value: 'check' },
          ],
        },
        { name: 'text', type: 'text', required: true },
      ],
    },
  ],
}

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'quote', type: 'textarea', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'place', label: 'City or company', type: 'text' },
      ],
      admin: {
        description:
          'Real quotes from real customers or partners only (docs/14). Product ratings come from the Reviews block, never typed here.',
      },
    },
  ],
}

export const FaqBlock: Block = {
  slug: 'faq',
  interfaceName: 'FaqBlock',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Frequently asked questions' },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
  ],
}

export const VideoBlock: Block = {
  slug: 'video',
  interfaceName: 'VideoBlock',
  labels: { singular: 'Video', plural: 'Videos' },
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'youtubeUrl',
      label: 'YouTube link',
      type: 'text',
      required: true,
      validate: (value: string | null | undefined) =>
        !value || YOUTUBE.test(value.trim())
          ? true
          : 'Paste a YouTube link, for example https://youtu.be/…',
    },
    { name: 'caption', type: 'text' },
  ],
}

export const DownloadsBlock: Block = {
  slug: 'downloads',
  interfaceName: 'DownloadsBlock',
  labels: { singular: 'Downloads', plural: 'Downloads' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Catalogues and brochures' },
    {
      name: 'documentType',
      label: 'Show',
      type: 'select',
      defaultValue: 'catalogue',
      options: [
        { label: 'Catalogues', value: 'catalogue' },
        { label: 'Brochures', value: 'brochure' },
        { label: 'Price lists', value: 'price-list' },
        { label: 'All public documents', value: 'all' },
      ],
    },
    { name: 'limit', type: 'number', defaultValue: 6, min: 1, max: 24 },
  ],
}

export const DealerFinderBlock: Block = {
  slug: 'dealerFinder',
  interfaceName: 'DealerFinderBlock',
  labels: { singular: 'Dealer finder', plural: 'Dealer finders' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Find a dealer near you' },
    { name: 'text', type: 'textarea' },
    { name: 'buttonLabel', label: 'Button text', type: 'text', defaultValue: 'Find a dealer' },
  ],
}

export const EnquiryFormBlock: Block = {
  slug: 'enquiryForm',
  interfaceName: 'EnquiryFormBlock',
  labels: { singular: 'Enquiry form', plural: 'Enquiry forms' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Talk to us' },
    { name: 'text', type: 'textarea' },
    {
      name: 'enquiryType',
      label: 'Lands in the inbox as',
      type: 'select',
      defaultValue: 'general',
      options: [
        { label: 'General question', value: 'general' },
        { label: 'Bulk order', value: 'bulk' },
        { label: 'Project', value: 'project' },
        { label: 'Dealership', value: 'dealership' },
      ],
    },
  ],
}

export const BrandStoryBlock: Block = {
  slug: 'brandStory',
  interfaceName: 'BrandStoryBlock',
  labels: { singular: 'Brand story and numbers', plural: 'Brand stories' },
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'text', type: 'textarea' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'stats',
      label: 'Numbers',
      type: 'array',
      maxRows: 4,
      fields: [
        { name: 'value', type: 'text', required: true, admin: { placeholder: '25+' } },
        { name: 'label', type: 'text', required: true, admin: { placeholder: 'Years' } },
      ],
    },
  ],
}

// ---- Growth blocks (Phase 1 growth features) -------------------------------------------------

/** A scheme of this store (the page's own), never another store's */
const schemeField = (required: boolean, description: string) => ({
  name: 'scheme',
  type: 'relationship' as const,
  relationTo: 'schemes' as const,
  required,
  admin: { description },
  filterOptions: ({ data }: { data: { tenant?: unknown } }) => {
    const tenant =
      data?.tenant && typeof data.tenant === 'object'
        ? (data.tenant as { id?: unknown }).id
        : data?.tenant
    return tenant ? { tenant: { equals: tenant } } : false
  },
})

export const OfferStripBlock: Block = {
  slug: 'offerStrip',
  interfaceName: 'OfferStripBlock',
  labels: { singular: 'Offer strip', plural: 'Offer strips' },
  fields: [
    schemeField(
      false,
      'Empty: whichever scheme is live. The strip hides itself while no scheme is live.',
    ),
    { name: 'buttonLabel', label: 'Button text', type: 'text', defaultValue: 'Shop the offer' },
  ],
}

export const SchemeProductsBlock: Block = {
  slug: 'schemeProducts',
  interfaceName: 'SchemeProductsBlock',
  labels: { singular: 'Scheme products', plural: 'Scheme products' },
  fields: [
    { name: 'heading', type: 'text' },
    schemeField(true, 'Shows the products this scheme covers, with their offer prices'),
    { name: 'limit', type: 'number', defaultValue: 8, min: 1, max: 24 },
  ],
}

export const CouponListBlock: Block = {
  slug: 'couponList',
  interfaceName: 'CouponListBlock',
  labels: { singular: 'Coupon list', plural: 'Coupon lists' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Coupon codes' },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 4,
      min: 1,
      max: 12,
      admin: { description: 'Coupons set to show on the Offers page, newest first' },
    },
  ],
}

export const ReviewsBlock: Block = {
  slug: 'reviews',
  interfaceName: 'ReviewsBlock',
  labels: { singular: 'Reviews', plural: 'Reviews' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'What our customers say' },
    {
      name: 'minRating',
      label: 'Show reviews with',
      type: 'select',
      defaultValue: '4',
      options: [
        { label: '4 stars and up', value: '4' },
        { label: '5 stars only', value: '5' },
        { label: 'Any rating', value: '1' },
      ],
      admin: {
        description: 'Published reviews only, from verified purchases. Never edited by the store.',
      },
    },
    { name: 'limit', type: 'number', defaultValue: 6, min: 1, max: 12 },
  ],
}

export const OffersSignupBlock: Block = {
  slug: 'offersSignup',
  interfaceName: 'OffersSignupBlock',
  labels: { singular: 'Offers sign-up', plural: 'Offers sign-ups' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Hear about the next offer first' },
    { name: 'text', type: 'textarea' },
  ],
}

export const AffiliateInviteBlock: Block = {
  slug: 'affiliateInvite',
  interfaceName: 'AffiliateInviteBlock',
  labels: { singular: 'Affiliate invite', plural: 'Affiliate invites' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Earn with us' },
    { name: 'text', type: 'textarea' },
    {
      name: 'buttonLabel',
      label: 'Button text',
      type: 'text',
      defaultValue: 'Join the affiliate program',
    },
  ],
}

/** The feature each optional block needs (docs/screens Page builder rule 5) */
export const BLOCK_FEATURE: Record<string, string> = {
  offerStrip: 'schemes',
  schemeProducts: 'schemes',
  couponList: 'coupons',
  reviews: 'reviews',
  offersSignup: 'offer-messages',
  affiliateInvite: 'affiliate',
}

const GROUP_ORDER: BlockGroup[] = ['marketing', 'commerce', 'basic', 'utility']

/**
 * The page builder's presentation of a block (src/blocks/meta.ts): its group in the "Add block"
 * library, thumbnail, and a row label that names the block by its content. Data shape unchanged.
 */
function forPageBuilder(block: Block): Block {
  const meta = BLOCK_META[block.slug]
  if (!meta) return block
  return {
    ...block,
    admin: {
      ...block.admin,
      group: BLOCK_GROUPS[meta.group],
      images: { thumbnail: { url: blockThumbnail(block.slug), alt: meta.description } },
      components: { ...block.admin?.components, Label: '@/blocks/admin/BlockLabel#BlockLabel' },
    },
  }
}

const groupIndex = (block: Block) => {
  const group = BLOCK_META[block.slug]?.group
  return group ? GROUP_ORDER.indexOf(group) : GROUP_ORDER.length
}

/** Every block a page can use, grouped as the "Add block" library shows them. */
export const PAGE_BLOCKS: Block[] = [
  HeroBlock,
  BannerBlock,
  ProductGridBlock,
  CategoryTilesBlock,
  RichTextBlock,
  ImageTextBlock,
  BenefitsBlock,
  TestimonialsBlock,
  FaqBlock,
  VideoBlock,
  DownloadsBlock,
  DealerFinderBlock,
  EnquiryFormBlock,
  BrandStoryBlock,
  OfferStripBlock,
  SchemeProductsBlock,
  CouponListBlock,
  ReviewsBlock,
  OffersSignupBlock,
  AffiliateInviteBlock,
]
  .map(forPageBuilder)
  // Stable sort: blocks keep their order inside a group
  .sort((a, b) => groupIndex(a) - groupIndex(b))
