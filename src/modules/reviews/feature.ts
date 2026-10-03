import { z } from 'zod'

import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'wishlist',
    label: 'Wishlist',
    module: 'reviews',
    phase: 'mvp',
    group: 'growth',
    defaultOn: true,
  },
  {
    key: 'reviews',
    label: 'Reviews and ratings',
    module: 'reviews',
    phase: 'mvp',
    group: 'growth',
    defaultOn: true,
    configSchema: z.object({
      holdForApproval: z.boolean().default(true),
      showOnProductPages: z.boolean().default(true),
      requestAfterDays: z.number().int().min(1).max(60).default(5),
      // WhatsApp review requests also need the whatsapp-offers switch (docs/08)
      requestChannels: z
        .array(z.enum(['email', 'whatsapp']))
        .min(1)
        .default(['email']),
      allowPhotos: z.boolean().default(true),
    }),
  },
])
