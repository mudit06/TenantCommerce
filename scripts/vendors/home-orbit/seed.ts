/**
 * pnpm seed:home-orbit: onboards Home Orbit (vendor 1) on the local database and loads its
 * catalogue: brand, store settings, attribute sets, categories, 110 products with photos, the
 * About us page, a home page built from blocks and menus. Run `pnpm seed` first (plans and
 * super admin). Safe to run again: existing records (matched by slug or model number) are kept.
 *
 * Business details come from business.json next to this file (git-ignored), or the placeholders
 * in business.example.json. The store stays in draft: http://home-orbit.localhost:3000 shows a
 * preview in development only.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import config from '@payload-config'
import { createLocalReq, getPayload, type PayloadRequest } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { outlineToLexical, plainTextToLexical } from '@/lib/richtext'
import { createTenant } from '@/modules/tenancy'
import type { Media, Page } from '@/payload-types'

import { ABOUT_US, ATTRIBUTE_SETS, CATEGORIES, PRODUCTS, type ProductSeed } from './catalogue'
import { PRIVACY_POLICY } from './policies'

// fileURLToPath, not URL.pathname: on Windows the pathname is /C:/... and breaks every path
const here = path.dirname(fileURLToPath(import.meta.url))
const businessFile = existsSync(path.join(here, 'business.json'))
  ? 'business.json'
  : 'business.example.json'
const business = JSON.parse(readFileSync(path.join(here, businessFile), 'utf8'))
const SLUG = 'home-orbit'
const HOME_SEO = {
  title: 'Home Orbit · Stainless steel door hardware and bathroom accessories',
  description:
    'Stainless steel aldrops, pull handles, glass door handles, key hangers, curtain brackets and bathroom accessories from Home Orbit.',
}

const payload = await getPayload({ config })

async function superAdminReq(): Promise<PayloadRequest> {
  const { docs } = await payload.find({
    collection: 'users',
    where: { platformRole: { equals: 'super-admin' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (!docs[0]) throw new Error('No super admin yet: run `pnpm seed` first')
  return createLocalReq({ user: { ...docs[0], collection: 'users' } }, payload)
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

async function upload(
  req: PayloadRequest,
  tenantId: string,
  file: string,
  alt: string,
): Promise<Media> {
  const filename = path.basename(file)
  const { docs } = await payload.find({
    collection: 'media',
    where: { and: [{ tenant: { equals: tenantId } }, { alt: { equals: alt } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (docs[0]) return docs[0]
  return payload
    .create({
      collection: 'media',
      data: { tenant: tenantId, alt },
      filePath: file,
      overrideAccess: true,
      req,
    })
    .catch((error: unknown) => {
      throw new Error(`Upload failed for ${filename}: ${String(error)}`)
    })
}

const photo = (name: string) => path.join(here, 'photos', `${name}.webp`)

/** Short description from the catalogue facts (options and material). */
function describe(product: ProductSeed): string {
  const a = product.attributes ?? {}
  const parts: string[] = []
  const list = (values: unknown, labels: Record<string, string>) =>
    Array.isArray(values) ? values.map((v) => labels[v as string] ?? v).join(', ') : ''
  if (product.category === 'Aldrops') {
    parts.push(`Stainless steel aldrop, model ${product.model}.`)
    parts.push(
      `Rod lengths ${list(a.rod_length, { '8-inch': '8"', '10-inch': '10"', '12-inch': '12"' })}.`,
    )
    if (Array.isArray(a.finish))
      parts.push(
        `Finishes: ${list(a.finish, { 'two-tone': 'two tone', 'rose-gold': 'rose gold', 'brass-antique': 'brass antique' })}.`,
      )
  } else if (product.category === 'Pull handles') {
    parts.push(`Stainless steel pull handle, model ${product.model}, in 8", 10" and 12" sizes.`)
    parts.push('Finishes: antique, stainless steel, chrome plated, black matt and rose gold.')
  } else if (a.material === 'aluminium') {
    parts.push(`Aluminium ${product.genericName.toLowerCase()}, model ${product.model}.`)
  } else if (a.material === 'stainless-steel') {
    parts.push(`Stainless steel ${product.genericName.toLowerCase()}, model ${product.model}.`)
  } else {
    parts.push(`${product.genericName}, model ${product.model}.`)
  }
  if (product.model === 'HO-LSD-01')
    parts.push(
      'Wall-mounted, with a clear window to check the soap level. Matte black, rose gold, chrome or gold.',
    )
  return parts.join(' ')
}

const KEYWORDS: Record<string, string> = {
  Aldrops: 'aldrop, door latch, kundi, tower bolt',
  'Pull handles': 'door handle, pull handle, main door handle',
  'Glass door handles': 'glass door handle, round handle, shop door handle',
  'Door stoppers': 'door stopper, door stop, magnetic stopper',
  'Key hangers': 'key holder, key stand, wall hanger',
  'Curtain brackets': 'curtain finial, curtain rod bracket',
}

try {
  const req = await superAdminReq()

  // 1. The store (same steps as the New vendor screen)
  let tenant = (
    await payload.find({
      collection: 'tenants',
      where: { slug: { equals: SLUG } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]
  if (!tenant) {
    const { docs: plans } = await payload.find({
      collection: 'plans',
      where: { code: { equals: business.planCode } },
      limit: 1,
      overrideAccess: true,
    })
    if (!plans[0]) throw new Error(`Plan "${business.planCode}" not found: run \`pnpm seed\` first`)
    const result = await withTransaction(req, () =>
      createTenant(req, {
        business: business.business,
        store: { slug: SLUG },
        plan: { planId: String(plans[0]!.id), trialDays: 14, billingCycle: 'monthly' },
        owner: { ...business.owner, sendInvite: false },
      }),
    )
    tenant = result.tenant
    console.log(
      `+ store ${SLUG} (${result.primaryHost}); owner ${business.owner.email} sets a password at ${result.ownerInviteUrl}`,
    )
  } else {
    console.log(`· store ${SLUG}`)
  }
  const tenantId = String(tenant.id)
  if (businessFile === 'business.example.json') {
    console.warn(
      '! Using placeholder business details (business.example.json). Copy it to business.json with the real ones.',
    )
  }

  // 2. Brand and store settings
  const logo = await upload(
    req,
    tenantId,
    path.join(here, 'brand', 'logo.webp'),
    'Home Orbit, right choice for the home',
  )
  const icon = await upload(req, tenantId, path.join(here, 'brand', 'icon.png'), 'Home Orbit icon')
  const settings = (
    await payload.find({
      collection: 'site-settings',
      where: { tenant: { equals: tenantId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]
  if (settings) {
    await payload.update({
      collection: 'site-settings',
      id: settings.id,
      data: {
        storeName: 'Home Orbit',
        themeColor: '#F28432',
        logo: logo.id,
        favicon: icon.id,
        contact: business.contact,
        grievanceOfficer: business.grievanceOfficer,
        legalDefaults: business.legalDefaults,
        seoDefaults: { titleTemplate: '%s · Home Orbit' },
      },
      overrideAccess: true,
      req,
    })
  }

  // 3. Attribute sets
  const setIds = new Map<string, string>()
  for (const set of ATTRIBUTE_SETS) {
    const existing = (
      await payload.find({
        collection: 'attribute-sets',
        where: { and: [{ tenant: { equals: tenantId } }, { name: { equals: set.name } }] },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]
    const doc =
      existing ??
      (await payload.create({
        collection: 'attribute-sets',
        data: { tenant: tenantId, ...set },
        overrideAccess: true,
        req,
      }))
    setIds.set(set.name, String(doc.id))
  }
  console.log(`· ${setIds.size} attribute sets`)

  // 4. Categories (parents first), each with the first product photo as its tile.
  // 10 October 2026: "Soap dishes and dispensers" became Soap dishes, Soap dispensers, Tumbler
  // holders and Toilet paper holders (as home improvement stores group them). The old category
  // keeps its id; changing its slug leaves a redirect from the old address.
  const oldSoap = (
    await payload.find({
      collection: 'categories',
      where: {
        and: [{ tenant: { equals: tenantId } }, { slug: { equals: 'soap-dishes-and-dispensers' } }],
      },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]
  if (oldSoap) {
    const dish = PRODUCTS.find((p) => p.category === 'Soap dishes')!
    const tile = await upload(req, tenantId, photo(dish.model), dish.title)
    await payload.update({
      collection: 'categories',
      id: oldSoap.id,
      data: {
        name: 'Soap dishes',
        slug: 'soap-dishes',
        description: CATEGORIES.find((c) => c.name === 'Soap dishes')!.description,
        image: tile.id,
      },
      overrideAccess: true,
      req,
    })
    console.log('+ category: Soap dishes and dispensers is now Soap dishes')
  }
  const categoryIds = new Map<string, string>()
  for (const [index, category] of CATEGORIES.entries()) {
    const slug = slugify(category.name)
    const existing = (
      await payload.find({
        collection: 'categories',
        where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: slug } }] },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]
    if (existing) {
      categoryIds.set(category.name, String(existing.id))
      continue
    }
    const first = PRODUCTS.find(
      (p) =>
        p.category === category.name ||
        CATEGORIES.find((c) => c.name === p.category)?.parent === category.name,
    )
    const tile = first ? await upload(req, tenantId, photo(first.model), first.title) : null
    // A category added to an existing store goes after its siblings, wherever staff put them
    const parent = category.parent ? categoryIds.get(category.parent) : undefined
    const last = (
      await payload.find({
        collection: 'categories',
        where: {
          and: [
            { tenant: { equals: tenantId } },
            parent ? { parent: { equals: parent } } : { parent: { exists: false } },
          ],
        },
        sort: '-sortOrder',
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]
    const doc = await payload.create({
      collection: 'categories',
      data: {
        tenant: tenantId,
        name: category.name,
        slug,
        description: category.description,
        parent,
        attributeSet: category.set ? setIds.get(category.set) : undefined,
        image: tile?.id,
        sortOrder: Math.max(index, (last?.sortOrder ?? -1) + 1),
        isVisible: true,
      },
      overrideAccess: true,
      req,
    })
    categoryIds.set(category.name, String(doc.id))
  }
  console.log(`· ${categoryIds.size} categories`)

  // 5. Products, live as a catalogue with enquiries (docs/00 "First vendor")
  let created = 0
  for (const product of PRODUCTS) {
    const exists = await payload.count({
      collection: 'products',
      where: {
        and: [{ tenant: { equals: tenantId } }, { modelNumber: { equals: product.model } }],
      },
      overrideAccess: true,
    })
    if (exists.totalDocs > 0) continue
    const image = await upload(req, tenantId, photo(product.model), product.title)
    await payload.create({
      collection: 'products',
      data: {
        tenant: tenantId,
        title: product.title,
        modelNumber: product.model,
        primaryCategory: categoryIds.get(product.category)!,
        categories: (product.alsoIn ?? []).map((name) => categoryIds.get(name)!),
        shortDescription: describe(product),
        highlights: [
          { text: 'Premium quality' },
          { text: 'Durable finish' },
          { text: 'Modern design' },
        ],
        gallery: [image.id],
        attributes: product.attributes ?? {},
        searchKeywords: [
          product.model.replace('-', ' '),
          product.model.replace('-', ''),
          KEYWORDS[product.category],
        ]
          .filter(Boolean)
          .join(', '),
        legal: {
          genericName: product.genericName,
          netQuantity: '1 piece',
          countryOfOrigin: 'IN',
          madeBy: 'manufacturer',
        },
        purchaseMode: 'enquire',
        isFeatured:
          Boolean(product.featured) ||
          [
            'HOAL-201',
            'HOPH-504',
            'HOGDH-610',
            'HOKH-753',
            'HOCB-805',
            'HOPH-506',
            'HOGDH-602',
            'HOKH-701',
          ].includes(product.model),
        status: 'active',
      },
      overrideAccess: true,
      req,
    })
    created += 1
  }
  console.log(
    `${created ? '+' : '·'} products: ${created} added, ${PRODUCTS.length} in the catalogue`,
  )

  // 5b. Products made before the bathroom categories were split move to their new category
  // (and "also show in" the others), once; products staff have filed elsewhere are left alone.
  const refiled = new Set([
    'Soap dishes',
    'Soap dispensers',
    'Tumbler holders',
    'Toilet paper holders',
  ])
  const movedFrom = new Set([String(oldSoap?.id ?? ''), categoryIds.get('Bathroom accessories')])
  let moved = 0
  for (const product of PRODUCTS) {
    if (!refiled.has(product.category) && !product.alsoIn?.length) continue
    const doc = (
      await payload.find({
        collection: 'products',
        where: {
          and: [{ tenant: { equals: tenantId } }, { modelNumber: { equals: product.model } }],
        },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]
    if (!doc) continue
    const primary = categoryIds.get(product.category)!
    const current = String(doc.primaryCategory)
    const also = (product.alsoIn ?? []).map((name) => categoryIds.get(name)!)
    const hasAlso = also.every((id) => (doc.categories ?? []).map(String).includes(id))
    if ((current === primary || !movedFrom.has(current)) && hasAlso) continue
    await payload.update({
      collection: 'products',
      id: doc.id,
      data: {
        primaryCategory: movedFrom.has(current) ? primary : current,
        categories: [...new Set([...(doc.categories ?? []).map(String), ...also])],
      },
      overrideAccess: true,
      req,
    })
    moved += 1
  }
  if (moved) console.log(`+ products: ${moved} moved to the new bathroom categories`)

  // 6. Pages: About us (from Home_Orbit_Content.docx) and the home page
  async function ensurePage(
    slug: string,
    data: Omit<Page, 'id' | 'updatedAt' | 'createdAt' | 'tenant' | 'slug'>,
  ) {
    const existing = (
      await payload.find({
        collection: 'pages',
        where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: slug } }] },
        limit: 1,
        draft: true,
        overrideAccess: true,
      })
    ).docs[0]
    if (existing && existing._status === 'published') return existing
    const input = { tenant: tenantId, slug, ...data, _status: 'published' as const }
    return existing
      ? payload.update({
          collection: 'pages',
          id: existing.id,
          data: input,
          overrideAccess: true,
          req,
        })
      : payload.create({ collection: 'pages', data: input, overrideAccess: true, req })
  }
  const media = async (model: string) =>
    (await upload(req, tenantId, photo(model), PRODUCTS.find((p) => p.model === model)!.title)).id
  const cat = (name: string) => ({ type: 'category' as const, category: categoryIds.get(name) })
  const about = await ensurePage('about-us', {
    title: 'About us',
    template: 'default',
    layout: [
      { blockType: 'richText', content: plainTextToLexical(ABOUT_US.join('\n\n')) as never },
    ],
  })
  const rackBanner = await upload(
    req,
    tenantId,
    photo(`banner-towelRack`),
    'Stainless steel towel rack: luxury in every hang',
  )
  const ringsPhoto = await upload(
    req,
    tenantId,
    photo(`banner-towelRings`),
    'Hexagon stainless steel towel rings',
  )

  /**
   * The home page (docs/screens storefront `st-home`, look of 10 October 2026): hero slider, the
   * live offer, benefits, category cards, a promo row of featured designs, carousels by range, the
   * brand story, then dealers, reviews, the offers sign-up, questions and the bulk enquiry form.
   * Blocks of switched-off features, or with nothing real to show, hide themselves.
   */
  const homeLayout = async (): Promise<NonNullable<Page['layout']>> => [
    {
      blockType: 'hero',
      autoplay: true,
      slides: [
        {
          image: await media('HOAL-201'),
          eyebrow: 'Premium quality · Durable finish · Modern design',
          heading: 'Right choice for the home',
          subheading:
            'Stainless steel aldrops, door handles, key hangers and bathroom accessories, designed to last.',
          buttonLabel: 'Shop door hardware',
          buttonLink: cat('Door hardware'),
        },
        {
          image: await media('HOGDH-610'),
          eyebrow: 'Glass door handles',
          heading: 'Handles with a story',
          subheading: 'Om, Ganesha, Shubh Labh, peacock and lotus designs cut in stainless steel.',
          buttonLabel: 'Shop glass door handles',
          buttonLink: cat('Glass door handles'),
        },
        {
          image: await media('HOKH-753'),
          eyebrow: 'Home decor',
          heading: 'Key hangers that welcome you home',
          subheading: 'Stainless steel and aluminium designs, from Sweet Home to devotional.',
          buttonLabel: 'Shop key hangers',
          buttonLink: cat('Key hangers'),
        },
      ],
    },
    { blockType: 'offerStrip', buttonLabel: 'Shop the offer' },
    {
      blockType: 'benefits',
      style: 'strip',
      items: [
        { icon: 'badge', text: 'Premium quality' },
        { icon: 'shield', text: 'Durable finish' },
        { icon: 'check', text: 'Modern design' },
        { icon: 'phone', text: 'Quotes on WhatsApp' },
      ],
    },
    {
      blockType: 'categoryTiles',
      eyebrow: 'Browse',
      heading: 'Shop by category',
      style: 'cards',
      showViewAll: true,
      categories: CATEGORIES.filter((c) => c.parent).map((c) => categoryIds.get(c.name)!),
    },
    {
      blockType: 'productGrid',
      eyebrow: 'Curated selection',
      heading: 'Designed for modern homes',
      source: 'featured',
      limit: 8,
      layout: 'promo',
      promo: {
        image: ringsPhoto.id,
        eyebrow: 'Bathroom refresh',
        heading: 'Hexagon towel rings in stainless steel',
        buttonLabel: 'Shop towel rings',
        buttonLink: cat('Towel rings'),
      },
    },
    {
      blockType: 'productGrid',
      eyebrow: 'Door hardware',
      heading: 'Glass door handles',
      source: 'category',
      category: categoryIds.get('Glass door handles'),
      limit: 8,
      layout: 'carousel',
    },
    { blockType: 'banner', image: rackBanner.id, layout: 'full', link: cat('Towel racks') },
    {
      blockType: 'benefits',
      style: 'marquee',
      items: [
        'Aldrops',
        'Pull handles',
        'Glass door handles',
        'Key hangers',
        'Towel racks',
        'Soap dispensers',
      ].map((text) => ({ icon: 'badge' as const, text })),
    },
    {
      blockType: 'productGrid',
      eyebrow: 'Home decor',
      heading: 'Key hangers',
      source: 'category',
      category: categoryIds.get('Key hangers'),
      limit: 8,
      layout: 'carousel',
    },
    {
      blockType: 'productGrid',
      eyebrow: 'Bathroom accessories',
      heading: 'Shelves, soap dishes and dispensers',
      source: 'category',
      category: categoryIds.get('Bathroom accessories'),
      limit: 8,
      layout: 'carousel',
    },
    {
      blockType: 'brandStory',
      heading: 'About Home Orbit',
      text: `${ABOUT_US[0]}\n\n${ABOUT_US[1]}`,
      image: ringsPhoto.id,
      stats: [
        { value: '7+', label: 'Years' },
        { value: `${PRODUCTS.length}+`, label: 'Designs' },
        { value: '15', label: 'Ranges' },
      ],
    },
    {
      blockType: 'dealerFinder',
      heading: 'See it before you buy',
      text: 'Visit a Home Orbit dealer near you to see the finishes in person.',
      buttonLabel: 'Find a dealer',
    },
    { blockType: 'reviews', heading: 'What buyers say', minRating: '4', limit: 6 },
    {
      blockType: 'offersSignup',
      heading: 'Get our offers first',
      text: 'New designs and festival offers from Home Orbit. At most 2 messages a week.',
    },
    {
      blockType: 'faq',
      heading: 'Questions',
      items: [
        {
          question: 'Do you deliver to my pincode?',
          answer:
            'Enter your pincode on any product page or in the cart to see whether we deliver there, the delivery date and the delivery charge.',
        },
        {
          question: 'Is cash on delivery available?',
          answer:
            'The pincode check on each product page shows whether cash on delivery is available for your address and order.',
        },
        {
          question: 'Do prices include GST?',
          answer:
            'Yes. Every price on the store includes GST, and each order comes with a GST invoice.',
        },
        {
          question: 'Can I order in bulk or as a dealer?',
          answer:
            'Yes. Use the bulk and dealer enquiry form below, or Request a bulk quote on a product page, and we will send prices and availability.',
        },
      ],
    },
    {
      blockType: 'enquiryForm',
      heading: 'Bulk and dealer enquiries',
      text: 'Builders, dealers and retailers: tell us what you need and we will send prices and availability.',
      enquiryType: 'bulk',
    },
  ]

  const home = await ensurePage('home', {
    title: 'Home',
    template: 'landing',
    seo: HOME_SEO,
    layout: await homeLayout(),
  })
  // 6b. A home page from the first seed (before 10 October 2026) gets the current layout, unless
  // staff have changed it since: it still opens with the seeded hero and has no category cards.
  const layout = (home.layout ?? []) as NonNullable<Page['layout']>
  const first = layout[0]
  const seededHero =
    first?.blockType === 'hero' && first.slides?.[0]?.heading === 'Right choice for the home'
  const hasCards = layout.some((b) => b.blockType === 'categoryTiles' && b.style === 'cards')
  if (seededHero && !hasCards) {
    await payload.update({
      collection: 'pages',
      id: home.id,
      data: { layout: await homeLayout(), seo: HOME_SEO, _status: 'published' },
      overrideAccess: true,
      req,
    })
    console.log('+ home: the October 2026 layout (category cards, promo row, carousels)')
  }
  console.log('· pages: About us, Home (published)')

  // 6c. Privacy policy: the draft placeholder from store setup gets Home Orbit's policy
  // (policies.ts) and is published, so the footer links to it. A page staff wrote is kept.
  const privacy = (
    await payload.find({
      collection: 'pages',
      where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: 'privacy' } }] },
      limit: 1,
      draft: true,
      overrideAccess: true,
    })
  ).docs[0]
  if (privacy && JSON.stringify(privacy.layout ?? []).includes('Write the privacy policy')) {
    await payload.update({
      collection: 'pages',
      id: privacy.id,
      data: {
        title: 'Privacy policy',
        layout: [{ blockType: 'richText', content: outlineToLexical(PRIVACY_POLICY) as never }],
        seo: {
          title: 'Privacy policy',
          description:
            'What personal data Home Orbit collects, why, who we share it with and your rights.',
        },
        _status: 'published',
      },
      overrideAccess: true,
      req,
    })
    console.log('+ privacy policy (published; Home Orbit to review)')
  }

  // 7. Menus: grouped the way home improvement stores group hardware and bath fittings, each top
  // item with up to three columns (a range, a finish or a material links to the filtered list)
  // and a dropdown picture. A menu from the first seed (one column named like its item) is
  // replaced; a menu staff have built is kept.
  const nav = (
    await payload.find({
      collection: 'navigation',
      where: { tenant: { equals: tenantId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]
  const firstSeedMenu = (nav?.header ?? []).some(
    (item) =>
      item.label === 'Bathroom' &&
      item.columns?.length === 1 &&
      item.columns[0]?.heading === 'Bathroom' &&
      !item.featuredImage,
  )
  if (nav && (!(nav.header ?? []).length || firstSeedMenu)) {
    const link = (label: string, name = label) => ({ label, link: cat(name) })
    const filtered = (label: string, category: string, query: string) => {
      const node = CATEGORIES.find((c) => c.name === category)!
      const path = [node.parent, node.name]
        .filter(Boolean)
        .map((n) => slugify(n!))
        .join('/')
      return { label, link: { type: 'url' as const, url: `/c/${path}?${query}` } }
    }
    await payload.update({
      collection: 'navigation',
      id: nav.id,
      data: {
        header: [
          {
            label: 'Door hardware',
            link: cat('Door hardware'),
            featuredImage: await media('HOAL-201'),
            columns: [
              {
                heading: 'Aldrops and latches',
                links: [
                  link('All aldrops', 'Aldrops'),
                  filtered('Laser-cut aldrops', 'Aldrops', 'range=laser-cutting'),
                  filtered('BMC-cut aldrops', 'Aldrops', 'range=bmc-cutting'),
                  filtered('Heavy aldrops', 'Aldrops', 'range=heavy'),
                  filtered('Classic aldrops', 'Aldrops', 'range=classic'),
                ],
              },
              {
                heading: 'Door handles',
                links: [
                  link('Pull handles'),
                  link('Glass door handles'),
                  filtered('Black matt handles', 'Pull handles', 'finish=black-matt'),
                  filtered('Rose gold handles', 'Pull handles', 'finish=rose-gold'),
                ],
              },
              { heading: 'Door accessories', links: [link('Door stoppers')] },
            ],
          },
          {
            label: 'Home decor',
            link: cat('Home decor'),
            featuredImage: await media('HOKH-753'),
            columns: [
              {
                heading: 'Key hangers',
                links: [
                  link('All key hangers', 'Key hangers'),
                  filtered(
                    'Stainless steel key hangers',
                    'Key hangers',
                    'material=stainless-steel',
                  ),
                  filtered('Aluminium key hangers', 'Key hangers', 'material=aluminium'),
                ],
              },
              { heading: 'Curtain hardware', links: [link('Curtain brackets')] },
            ],
          },
          {
            label: 'Bathroom',
            link: cat('Bathroom accessories'),
            featuredImage: rackBanner.id,
            columns: [
              { heading: 'Towel holders', links: [link('Towel rings'), link('Towel racks')] },
              {
                heading: 'Shelves and storage',
                links: [link('Bathroom shelves'), link('Tumbler holders')],
              },
              {
                heading: 'Soap and toilet',
                links: [link('Soap dishes'), link('Soap dispensers'), link('Toilet paper holders')],
              },
            ],
          },
          { label: 'About us', link: { type: 'page', page: about.id } },
          { label: 'Contact', link: { type: 'url', url: '/contact' } },
        ],
        footer: [
          {
            heading: 'Shop',
            links: [
              link('Aldrops'),
              link('Pull handles'),
              link('Glass door handles'),
              link('Key hangers'),
              link('Bathroom accessories'),
            ],
          },
          {
            heading: 'Company',
            links: [
              { label: 'About us', link: { type: 'page', page: about.id } },
              { label: 'Contact us', link: { type: 'url', url: '/contact' } },
            ],
          },
        ],
        mobileSameAsHeader: true,
      },
      overrideAccess: true,
      req,
    })
    console.log(`${firstSeedMenu ? '+' : '·'} menus`)
  }
  const host = (
    await payload.find({
      collection: 'tenant-domains',
      where: { tenant: { equals: tenantId } },
      limit: 1,
      overrideAccess: true,
    })
  ).docs[0]?.host
  console.log(`Home Orbit ready. Store preview: http://${host ?? `${SLUG}.localhost`}:3000`)
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
