/**
 * Re-crops the product photos from Home Orbit's catalogue PDF into ./photos (WebP, at most
 * 1200 px). Only needed when a new catalogue arrives; the cropped photos are committed.
 *
 *   pdftoppm -r 300 -jpeg <catalogue.pdf> /tmp/ho/page     (poppler-utils)
 *   node --experimental-strip-types scripts/vendors/home-orbit/crop-photos.mts /tmp/ho
 *
 * Render with pdftoppm, not pdfimages: the catalogue's CMYK pages come out inverted otherwise.
 */
import { mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { BANNERS, PRODUCTS } from './catalogue.ts'

const PREVIEW = { width: 852, height: 1102 }
const sourceDir = process.argv[2]
if (!sourceDir) throw new Error('Usage: crop-photos.mts <folder with pdftoppm page-NN.jpg>')
const pages = readdirSync(sourceDir)
  .filter((f) => /\.(jpe?g)$/i.test(f))
  .sort()
const outDir = path.join(import.meta.dirname, 'photos')
mkdirSync(outDir, { recursive: true })

async function crop(page: number, box: [number, number, number, number], name: string) {
  const file = path.join(sourceDir, pages[page - 1]!)
  const image = sharp(file)
  const { width = 0, height = 0 } = await image.metadata()
  const sx = width / PREVIEW.width
  const sy = height / PREVIEW.height
  const left = Math.max(0, Math.round(box[0] * sx))
  const top = Math.max(0, Math.round(box[1] * sy))
  const right = Math.min(width, Math.round(box[2] * sx))
  const bottom = Math.min(height, Math.round(box[3] * sy))
  await sharp(file)
    .extract({ left, top, width: right - left, height: bottom - top })
    .toColourspace('srgb')
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(outDir, `${name}.webp`))
}

for (const product of PRODUCTS) await crop(product.page, product.box, product.model)
for (const [name, banner] of Object.entries(BANNERS))
  await crop(banner.page, banner.box, `banner-${name}`)
console.log(
  `Cropped ${PRODUCTS.length} products and ${Object.keys(BANNERS).length} banners into ${outDir}`,
)
