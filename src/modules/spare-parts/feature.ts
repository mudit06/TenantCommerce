import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'spare-parts',
    label: 'Spare parts finder',
    module: 'spare-parts',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
