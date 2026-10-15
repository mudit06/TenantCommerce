/**
 * The media fields storefront code reads (`Img`, `mediaUrl`), for `populate` in storefront
 * queries. A populated photo then carries only these, so cached cards, categories and menus
 * stay small: otherwise every size's file details, the focal point and the store document are
 * copied into each entry. `filename` (and the store folder, `prefix`) must stay: Payload and the
 * storage plugin build each `url` from them when the document is read.
 */
export const MEDIA_FIELDS = {
  filename: true,
  prefix: true,
  url: true,
  alt: true,
  width: true,
  height: true,
  sizes: {
    thumb: { filename: true, url: true, width: true, height: true },
    card: { filename: true, url: true, width: true, height: true },
    detail: { filename: true, url: true, width: true, height: true },
  },
} as const
