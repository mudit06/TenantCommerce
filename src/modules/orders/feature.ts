import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'guest-checkout',
    label: 'Guest checkout',
    description: 'The only switch for guest checkout; vendors have no separate setting',
    module: 'orders',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: true,
  },
  {
    key: 'cod-confirmation',
    label: 'COD confirmation on WhatsApp',
    module: 'orders',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
