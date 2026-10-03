export const ENQUIRY_TYPES = [
  { value: 'product', label: 'Product question' },
  { value: 'bulk', label: 'Quote request' },
  { value: 'project', label: 'Project' },
  { value: 'dealership', label: 'Dealership' },
  { value: 'general', label: 'Contact form' },
] as const

export const ENQUIRY_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
] as const
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number]['value']

/** Inbox tabs (docs/06): New, In progress = contacted or quoted, Closed = won or lost */
export const ENQUIRY_TABS: readonly { label: string; statuses: readonly EnquiryStatus[] }[] = [
  { label: 'New', statuses: ['new'] },
  { label: 'In progress', statuses: ['contacted', 'quoted'] },
  { label: 'Closed', statuses: ['won', 'lost'] },
]
