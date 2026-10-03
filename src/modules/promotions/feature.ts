import { z } from 'zod'

import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'schemes',
    label: 'Schemes and offers',
    description: 'Festival schemes and special launch offers (retail shoppers in Phase 1)',
    module: 'promotions',
    phase: 'mvp',
    group: 'growth',
    defaultOn: true,
    configSchema: z.object({
      maxLiveSchemes: z.number().int().min(1).max(100).default(10),
      // Only ever counts down to the scheme's real end (docs/14, dark patterns)
      showCountdown: z.boolean().default(true),
    }),
  },
  {
    key: 'coupons',
    label: 'Coupons',
    module: 'promotions',
    phase: 'mvp',
    group: 'growth',
    defaultOn: true,
    configSchema: z.object({
      showPublicCodesAtCart: z.boolean().default(true),
      maxCodesPerBulkRun: z.number().int().min(1).max(5000).default(5000),
    }),
  },
  {
    key: 'trade-schemes',
    label: 'Trade schemes and dealer anniversary',
    module: 'promotions',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
    dependsOn: ['b2b', 'schemes'],
  },
])
