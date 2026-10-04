import { BLOCK_META, blockThumbnail } from '../meta'

const cssString = (text: string) => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/**
 * One line under each block's name in the "Add block" library, from src/blocks/meta.ts. Payload's
 * library has no description slot, so the text is attached by CSS to the block's card (matched
 * by its thumbnail); screen readers get the same words as the thumbnail's alt text.
 */
export function BlockLibraryHints() {
  const rules = Object.entries(BLOCK_META)
    .map(
      ([slug, meta]) =>
        `.blocks-drawer__block:has(img[src$="${blockThumbnail(slug)}"]) .thumbnail-card__label::after{content:${cssString(meta.description)}}`,
    )
    .join('\n')
  // Static text from our own code, not user input
  return <style dangerouslySetInnerHTML={{ __html: rules }} />
}
