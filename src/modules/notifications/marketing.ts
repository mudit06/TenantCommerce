// Marketing WhatsApp templates (docs/18 "Offer messages"): offers and cart reminders go out as
// Meta "marketing" templates from the vendor's own number, separate from the utility templates
// order updates use, so an order update never carries an offer. The button opens a page on the
// store's own domain; the variable is the path after the domain.

export const MARKETING_TEMPLATES = {
  offer_message: {
    label: 'Offer message',
    body: 'Hi {{1}}, {{2}}.\n{{3}}\nOffers from <Store>. You asked for offers on WhatsApp; reply STOP to stop them.',
    variables: ['customer.firstName', 'offer.headline', 'offer.ends'],
    button: 'Shop the offer',
    samples: [
      'Rahul',
      'our Diwali offer is on: 10% off all faucets and showers',
      'Ends Mon, 9 Nov.',
    ],
    buttonSample: 'offers/diwali-2026',
  },
  cart_reminder: {
    label: 'Cart reminder',
    body: 'Hi {{1}}, your cart at <Store> is saved: {{2}}.\nPrices can change when an offer ends. Reply STOP to stop offers.',
    variables: ['customer.firstName', 'cart.summary'],
    button: 'Return to your cart',
    samples: ['Rahul', 'Aria basin mixer and 1 more'],
    buttonSample: 'cart/restore/abc123',
  },
} as const

export type MarketingKey = keyof typeof MARKETING_TEMPLATES
export const MARKETING_KEYS = Object.keys(MARKETING_TEMPLATES) as MarketingKey[]
export const isMarketingKey = (value: string): value is MarketingKey => value in MARKETING_TEMPLATES

/** Fills {{1}}, {{2}}… for the preview and the dev log */
export const fillMarketing = (key: MarketingKey, params: string[], storeName: string) =>
  MARKETING_TEMPLATES[key].body
    .replace(/<Store>/g, storeName)
    .replace(/\{\{(\d+)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? '')
