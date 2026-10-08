import { z } from 'zod'

import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'affiliate',
    label: 'Affiliate program',
    description: 'Commissions to affiliates',
    module: 'affiliate',
    phase: 'mvp',
    group: 'growth',
    defaultOn: false,
    configSchema: z.object({
      defaultCommissionPercent: z.number().min(0).max(50).default(5),
      cookieDays: z.number().int().min(1).max(90).default(30),
      minPayoutMinor: z.number().int().min(0).default(50_000),
      autoApproveApplications: z.boolean().default(false),
      // Days after delivery before commission is approved (the return window, docs/11)
      holdDays: z.number().int().min(0).max(60).default(7),
      // The vendor's own terms page, linked from the application form
      termsPath: z.string().max(120).default('pages/affiliate-terms'),
    }),
  },
])
