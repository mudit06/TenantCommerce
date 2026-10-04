import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'enquiries',
    label: 'Enquiries inbox',
    module: 'enquiries',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: true,
  },
  {
    key: 'appointments',
    label: 'Virtual appointments',
    module: 'enquiries',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
