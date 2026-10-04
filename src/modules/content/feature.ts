import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'whatsapp-button',
    label: 'WhatsApp button',
    module: 'content',
    phase: 'mvp',
    group: 'mvp',
    defaultOn: true,
  },
  {
    key: 'multilingual',
    label: 'Multilingual store',
    module: 'content',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
  {
    key: 'lookbook',
    label: 'Lookbooks',
    module: 'content',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
  {
    key: 'blog',
    label: 'Blog',
    module: 'content',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
