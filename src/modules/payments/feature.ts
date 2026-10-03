import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'cod',
    label: 'Cash on delivery',
    description: 'Platform permission; the vendor then turns COD on and sets its rules in Payments',
    module: 'payments',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: true,
  },
])
