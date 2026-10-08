import { z } from 'zod'

import { defineFeatures } from '@/lib/features'

export const features = defineFeatures([
  {
    key: 'abandoned-cart',
    label: 'Abandoned cart reminders',
    module: 'cart',
    phase: 'mvp',
    group: 'growth',
    defaultOn: true,
    dependsOn: ['offer-messages'],
    configSchema: z.object({
      firstAfterMinutes: z
        .number()
        .int()
        .min(15)
        .max(24 * 60)
        .default(60),
      // null switches the second reminder off
      secondAfterHours: z
        .number()
        .int()
        .min(2)
        .max(7 * 24)
        .nullable()
        .default(24),
      secondCoupon: z.string().nullable().default(null),
      channels: z
        .array(z.enum(['email', 'whatsapp']))
        .min(1)
        .default(['email', 'whatsapp']),
      // The second reminder's channels (docs/screens Abandoned carts: email only by default)
      secondChannels: z
        .array(z.enum(['email', 'whatsapp']))
        .min(1)
        .default(['email']),
    }),
  },
])
