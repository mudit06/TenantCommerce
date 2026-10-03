import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'enquire-only-products',
    label: 'Enquire-only products',
    description: 'Products that show "Request quote" instead of a price',
    module: 'catalog',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: false,
  },
  {
    key: 'downloads',
    label: 'Downloads page',
    module: 'catalog',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: true,
  },
  {
    key: 'size-guide',
    label: 'Size guide',
    module: 'catalog',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: false,
  },
  {
    key: 'product-videos',
    label: 'Product videos',
    module: 'catalog',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: true,
  },
  {
    key: 'compare',
    label: 'Product compare',
    module: 'catalog',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
