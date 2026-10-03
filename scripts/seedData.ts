import type { FeatureKey } from '@/modules/features'
import type { OnboardingInput } from '@/modules/tenancy'

// Placeholder plans (docs/screens/super-admin.md Plans: names, prices and limits are
// placeholders until mudit sets them). Prices are paise, before GST.
const MVP_CORE: FeatureKey[] = [
  'guest-checkout',
  'cod',
  'pincode-check',
  'enquiries',
  'enquire-only-products',
  'dealer-locator',
  'downloads',
  'product-videos',
  'whatsapp-button',
  'size-guide',
  'schemes',
  'coupons',
  'wishlist',
  'reviews',
  'offer-messages',
  'whatsapp-offers',
  'abandoned-cart',
]
const GROWTH_EXTRA: FeatureKey[] = [
  'affiliate',
  'warranty',
  'service-requests',
  'installation-booking',
  'spare-parts',
  'compare',
  'loyalty',
  'multilingual',
]
const ENTERPRISE_EXTRA: FeatureKey[] = ['b2b', 'trade-schemes']
const ALL_CONNECTORS = ['razorpay', 'manual', 'shiprocket', 'meta-whatsapp', 'msg91'] as const

export const PLANS = [
  {
    code: 'starter',
    name: 'Starter',
    sortOrder: 10,
    priceMonthly: { amountMinor: 4_999_00, currency: 'INR' as const },
    priceYearly: { amountMinor: 49_990_00, currency: 'INR' as const },
    limits: { maxProducts: 500, maxStaffUsers: 3, maxStorageGB: 5, maxOrdersPerMonth: 1_000 },
    allowedModules: MVP_CORE,
    allowedConnectors: [...ALL_CONNECTORS],
  },
  {
    code: 'growth',
    name: 'Growth',
    sortOrder: 20,
    priceMonthly: { amountMinor: 9_999_00, currency: 'INR' as const },
    priceYearly: { amountMinor: 99_990_00, currency: 'INR' as const },
    limits: { maxProducts: 2_000, maxStaffUsers: 10, maxStorageGB: 20, maxOrdersPerMonth: 5_000 },
    allowedModules: [...MVP_CORE, ...GROWTH_EXTRA],
    allowedConnectors: [...ALL_CONNECTORS],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    sortOrder: 30,
    priceMonthly: { amountMinor: 24_999_00, currency: 'INR' as const },
    priceYearly: { amountMinor: 2_49_990_00, currency: 'INR' as const },
    limits: { maxProducts: 10_000, maxStaffUsers: 30, maxStorageGB: 100, maxOrdersPerMonth: null },
    allowedModules: [...MVP_CORE, ...GROWTH_EXTRA, ...ENTERPRISE_EXTRA],
    allowedConnectors: [...ALL_CONNECTORS],
  },
]

/** The two demo stores the README promises (docs/15: one sanitary, one clothing). */
export const DEMO_TENANTS: (Omit<OnboardingInput, 'plan'> & {
  planCode: string
  trialDays: number
})[] = [
  {
    planCode: 'growth',
    trialDays: 0,
    business: {
      name: 'Demo Sanitary',
      legalName: 'Aquaverde Ceramics Pvt Ltd',
      gstin: '24AAQCA4821K1ZI',
      registeredAddress: {
        line1: 'Survey 112, National Highway 8-A',
        city: 'Morbi',
        pincode: '363642',
      },
      industry: ['sanitary'],
      supportEmail: 'care@demo-sanitary.example',
      supportPhone: '+91 90000 00000',
    },
    store: { slug: 'demo-sanitary' },
    owner: { name: 'Priya Shah', email: 'owner@demo-sanitary.example', sendInvite: false },
  },
  {
    planCode: 'starter',
    trialDays: 14,
    business: {
      name: 'Demo Clothing',
      legalName: 'Loomhouse Apparel LLP',
      gstin: '27AALCL5532M1Z0',
      registeredAddress: { line1: 'Unit 7, Lower Parel', city: 'Mumbai', pincode: '400013' },
      industry: ['clothing'],
      supportEmail: 'care@demo-clothing.example',
    },
    store: { slug: 'demo-clothing' },
    owner: { name: 'Rahul Mehta', email: 'owner@demo-clothing.example', sendInvite: false },
  },
]
