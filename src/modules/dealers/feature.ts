import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'dealer-locator',
    label: 'Dealer locator',
    module: 'dealers',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: false,
  },
])
