import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'pincode-check',
    label: 'Pincode check',
    module: 'shipping',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: true,
  },
])
