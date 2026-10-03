import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'b2b',
    label: 'Trade accounts',
    description: 'Dealers, retailers, wholesalers, interior designers',
    module: 'b2b',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
