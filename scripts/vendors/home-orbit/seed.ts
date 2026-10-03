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

import config from '@payload-config'
import { createLocalReq, getPayload, type PayloadRequest } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { plainTextToLexical } from '@/lib/richtext'
import { createTenant } from '@/modules/tenancy'
import type { Media, Page } from '@/payload-types'

import { ABOUT_US, ATTRIBUTE_SETS, CATEGORIES, PRODUCTS, type ProductSeed } from './catalogue'

const here = path.dirname(new URL(import.meta.url).pathname)
const businessFile = existsSync(path.join(here, 'business.json'))
  ? 'business.json'
  : 'business.example.json'
const business = JSON.parse(readFileSync(path.join(here, businessFile), 'utf8'))
const SLUG = 'home-orbit'

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

  // 4. Categories (parents first), each with the first product photo as its tile
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
    const doc = await payload.create({
      collection: 'categories',
      data: {
        tenant: tenantId,
        name: category.name,
        slug,
        description: category.description,
        parent: category.parent ? categoryIds.get(category.parent) : undefined,
        attributeSet: category.set ? setIds.get(category.set) : undefined,
        image: tile?.id,
        sortOrder: index,
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
  const dispenserBanner = await upload(
    req,
    tenantId,
    photo(`banner-soapDispenser`),
    'Wall-mounted stainless steel liquid soap dispenser in four finishes',
  )
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
  await ensurePage('home', {
    title: 'Home',
    template: 'landing',
    seo: {
      title: 'Home Orbit · Stainless steel door hardware and bathroom accessories',
      description:
        'Stainless steel aldrops, pull handles, glass door handles, key hangers, curtain brackets and bathroom accessories from Home Orbit. Ask for a quote online.',
    },
    layout: [
      {
        blockType: 'hero',
        autoplay: false,
        slides: [
          {
            image: await media('HOAL-201'),
            heading: 'Right choice for the home',
            subheading:
              'Stainless steel aldrops, door handles, key hangers and bathroom accessories, designed to last.',
            buttonLabel: 'Shop door hardware',
            buttonLink: cat('Door hardware'),
          },
          {
            image: await media('HOPH-504'),
            heading: 'Pull handles',
            buttonLabel: 'Pull handles',
            buttonLink: cat('Pull handles'),
          },
        ],
      },
      {
        blockType: 'benefits',
        items: [
          { icon: 'badge', text: 'Premium quality' },
          { icon: 'shield', text: 'Durable finish' },
          { icon: 'check', text: 'Modern design' },
          { icon: 'phone', text: 'Quotes on WhatsApp' },
        ],
      },
      {
        blockType: 'categoryTiles',
        heading: 'Shop by category',
        style: 'tiles',
        categories: [
          'Aldrops',
          'Pull handles',
          'Glass door handles',
          'Key hangers',
          'Curtain brackets',
          'Door stoppers',
          'Towel rings',
          'Bathroom shelves',
        ].map((n) => categoryIds.get(n)!),
      },
      {
        blockType: 'productGrid',
        heading: 'Featured designs',
        source: 'featured',
        limit: 8,
        layout: 'grid',
      },
      {
        blockType: 'banner',
        image: dispenserBanner.id,
        layout: 'full',
        link: cat('Soap dishes and dispensers'),
      },
      {
        blockType: 'productGrid',
        heading: 'Glass door handles',
        source: 'category',
        category: categoryIds.get('Glass door handles'),
        limit: 4,
        layout: 'grid',
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
      { blockType: 'banner', image: rackBanner.id, layout: 'full', link: cat('Towel racks') },
      {
        blockType: 'productGrid',
        heading: 'Key hangers',
        source: 'category',
        category: categoryIds.get('Key hangers'),
        limit: 8,
        layout: 'grid',
      },
      {
        blockType: 'enquiryForm',
        heading: 'Bulk and dealer enquiries',
        text: 'Builders, dealers and retailers: tell us what you need and we will send prices and availability.',
        enquiryType: 'bulk',
      },
    ],
  })
  console.log('· pages: About us, Home (published)')

  // 7. Menus
  const nav = (
    await payload.find({
      collection: 'navigation',
      where: { tenant: { equals: tenantId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]
  if (nav && !(nav.header ?? []).length) {
    const column = (heading: string, names: string[]) => ({
      heading,
      links: names.map((n) => ({ label: n, link: cat(n) })),
    })
    await payload.update({
      collection: 'navigation',
      id: nav.id,
      data: {
        header: [
          {
            label: 'Door hardware',
            link: cat('Door hardware'),
            columns: [
              column('Door hardware', [
                'Aldrops',
                'Pull handles',
                'Glass door handles',
                'Door stoppers',
              ]),
            ],
          },
          {
            label: 'Home decor',
            link: cat('Home decor'),
            columns: [column('Home decor', ['Key hangers', 'Curtain brackets'])],
          },
          {
            label: 'Bathroom',
            link: cat('Bathroom accessories'),
            columns: [
              column('Bathroom', [
                'Towel rings',
                'Towel racks',
                'Bathroom shelves',
                'Soap dishes and dispensers',
              ]),
            ],
          },
          { label: 'About us', link: { type: 'page', page: about.id } },
          { label: 'Contact', link: { type: 'url', url: '/contact' } },
        ],
        footer: [
          column('Shop', [
            'Aldrops',
            'Pull handles',
            'Glass door handles',
            'Key hangers',
            'Bathroom accessories',
          ]),
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
    console.log('· menus')
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
