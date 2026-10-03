import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'loyalty',
    label: 'Loyalty points',
    module: 'loyalty',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
