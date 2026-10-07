import type { SchemeType } from './rules'

// "Start from an occasion" (docs/screens Schemes rule 1): each fills a draft's name, badge and
// offer type. The vendor always types the dates, because festival dates move every year.

export const OCCASIONS = [
  { value: 'diwali', label: 'Diwali', badge: 'Diwali offer', type: 'percent', percent: 10 },
  { value: 'holi', label: 'Holi', badge: 'Holi offer', type: 'buy-x-get-y', percent: 0 },
  {
    value: 'new-year',
    label: 'New Year',
    badge: 'New Year offer',
    type: 'free-shipping',
    percent: 0,
  },
  {
    value: 'wedding-season',
    label: 'Wedding Season',
    badge: 'Wedding season offer',
    type: 'tiered',
    percent: 0,
  },
  {
    value: 'launch',
    label: 'Special launch',
    badge: 'Launch price',
    type: 'special-price',
    percent: 0,
  },
  { value: 'custom', label: 'Blank scheme', badge: '', type: 'percent', percent: 0 },
] as const satisfies readonly {
  value: string
  label: string
  badge: string
  type: SchemeType
  percent: number
}[]

export type Occasion = (typeof OCCASIONS)[number]['value']

export const occasionOf = (value: string | null | undefined) =>
  OCCASIONS.find((o) => o.value === value) ?? OCCASIONS.at(-1)!

export const SCHEME_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'live', label: 'Live' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
] as const
export type SchemeStatus = (typeof SCHEME_STATUSES)[number]['value']

export const COUPON_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'expired', label: 'Expired' },
] as const
