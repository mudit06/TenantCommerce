import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'warranty',
    label: 'Warranty registration',
    module: 'warranty',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
  {
    key: 'service-requests',
    label: 'Service requests',
    module: 'warranty',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
    dependsOn: ['warranty'],
  },
  {
    key: 'installation-booking',
    label: 'Installation booking',
    module: 'warranty',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
