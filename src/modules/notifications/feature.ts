import { z } from 'zod'

import { defineFeatures } from '@/lib/features'

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time, for example 10:00')

export const features = defineFeatures([
  {
    key: 'offer-messages',
    label: 'Offer messages',
    description: 'Offer emails to opted-in shoppers',
    module: 'notifications',
    phase: 'mvp',
    group: 'growth',
    defaultOn: true,
    configSchema: z
      .object({
        maxPerShopperPerWeek: z.number().int().min(1).max(7).default(2),
        // Platform caps: only our team changes these (docs/08)
        maxPerShopperPerWeekCap: z.number().int().min(1).max(7).default(3),
        maxRecipientsPerCampaign: z.number().int().min(1).max(1_000_000).default(20_000),
        sendWindow: z
          .object({ start: time.default('10:00'), end: time.default('20:00') })
          .default({ start: '10:00', end: '20:00' }),
      })
      .refine((config) => config.maxPerShopperPerWeek <= config.maxPerShopperPerWeekCap, {
        message: 'Messages per shopper per week cannot exceed the platform cap',
        path: ['maxPerShopperPerWeek'],
      }),
    platformConfigKeys: ['maxPerShopperPerWeekCap', 'maxRecipientsPerCampaign'],
  },
  {
    key: 'whatsapp-offers',
    label: 'WhatsApp offers',
    description:
      "Offers and cart reminders on WhatsApp, about ₹1.02 each on the vendor's Meta bill. Our team switches it on when the vendor asks",
    module: 'notifications',
    phase: 'mvp',
    group: 'growth',
    defaultOn: false,
    dependsOn: ['offer-messages'],
  },
  {
    key: 'push-notifications',
    label: 'Push notifications',
    module: 'notifications',
    phase: 'phase-2',
    group: 'phase-2',
    defaultOn: false,
  },
])
