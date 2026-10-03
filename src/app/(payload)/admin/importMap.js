import { VendorHeader as VendorHeader_24bac79af4bee0c0bc3616e096eb62fe } from '@/modules/tenancy/admin/views/VendorHeader'
import { PlanUsage as PlanUsage_b86f7171c65cc13eb68898df458d8a5f } from '@/modules/tenancy/admin/views/PlanUsage'
import { RecentChanges as RecentChanges_fafd7d131f02cbb7c1197cc860509618 } from '@/modules/tenancy/admin/views/RecentChanges'
import { WatchTenantCollection as WatchTenantCollection_1d0591e3cf4f332c83a86da13a0de59a } from '@payloadcms/plugin-multi-tenant/client'
import { VendorListActions as VendorListActions_c364c31e5c4118356935ab3bca70b574 } from '@/modules/tenancy/admin/views/VendorListActions'
import { FeaturesView as FeaturesView_457aa103f9b1070a3c36e4d997f0df31 } from '@/modules/tenancy/admin/views/FeaturesView'
import { ConnectorsView as ConnectorsView_6fa3669d4f6cc1756665359f71374d25 } from '@/modules/tenancy/admin/views/ConnectorsView'
import { DomainsView as DomainsView_023709da29c164dc686af2358bd88ee1 } from '@/modules/tenancy/admin/views/DomainsView'
import { BillingView as BillingView_0c8006ee12f0cd4ffaa8d33e707b5c89 } from '@/modules/tenancy/admin/views/BillingView'
import { StaffView as StaffView_88420d81c6ae744f4633fdca3bc1ab0c } from '@/modules/tenancy/admin/views/StaffView'
import { RupeeInput as RupeeInput_7beaa54742b4112c777f1f3f389cd078 } from '@/fields/money/RupeeInput'
import { SubscriptionBillingField as SubscriptionBillingField_fcfef03775b3f583762b352607577092 } from '@/modules/tenancy/admin/views/SubscriptionBillingField'
import { SubscriptionSummary as SubscriptionSummary_8c5627b16a26c7886584b3e7212f1e00 } from '@/modules/tenancy/admin/views/SubscriptionSummary'
import { TenantField as TenantField_1d0591e3cf4f332c83a86da13a0de59a } from '@payloadcms/plugin-multi-tenant/client'
import { AssignTenantFieldTrigger as AssignTenantFieldTrigger_1d0591e3cf4f332c83a86da13a0de59a } from '@payloadcms/plugin-multi-tenant/client'
import { Icon as Icon_586723811577fcd570b153bacaa81664 } from '@/admin/graphics/Icon'
import { Logo as Logo_fb41377240e79a3f427000f9c4717644 } from '@/admin/graphics/Logo'
import { PlatformNavLinks as PlatformNavLinks_05ed6e28c7fd6535d64389b0d8cc4c3b } from '@/admin/nav/PlatformNavLinks'
import { TenantSelector as TenantSelector_d6d5f193a167989e2ee7d14202901e62 } from '@payloadcms/plugin-multi-tenant/rsc'
import { TenantSelectionProvider as TenantSelectionProvider_d6d5f193a167989e2ee7d14202901e62 } from '@payloadcms/plugin-multi-tenant/rsc'
import { Dashboard as Dashboard_1892ca63063ac8b0682f63e4a9002f9d } from '@/admin/views/Dashboard'
import { NewVendorView as NewVendorView_0bb47f900a4c6f1a63052138bef3cd34 } from '@/modules/tenancy/admin/views/NewVendorView'
import { TeamView as TeamView_db3d63515c7821c5d4463c3b81e815eb } from '@/modules/identity/admin/TeamView'
import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from '@payloadcms/next/rsc'

/** @type import('payload').ImportMap */
export const importMap = {
  "@/modules/tenancy/admin/views/VendorHeader#VendorHeader": VendorHeader_24bac79af4bee0c0bc3616e096eb62fe,
  "@/modules/tenancy/admin/views/PlanUsage#PlanUsage": PlanUsage_b86f7171c65cc13eb68898df458d8a5f,
  "@/modules/tenancy/admin/views/RecentChanges#RecentChanges": RecentChanges_fafd7d131f02cbb7c1197cc860509618,
  "@payloadcms/plugin-multi-tenant/client#WatchTenantCollection": WatchTenantCollection_1d0591e3cf4f332c83a86da13a0de59a,
  "@/modules/tenancy/admin/views/VendorListActions#VendorListActions": VendorListActions_c364c31e5c4118356935ab3bca70b574,
  "@/modules/tenancy/admin/views/FeaturesView#FeaturesView": FeaturesView_457aa103f9b1070a3c36e4d997f0df31,
  "@/modules/tenancy/admin/views/ConnectorsView#ConnectorsView": ConnectorsView_6fa3669d4f6cc1756665359f71374d25,
  "@/modules/tenancy/admin/views/DomainsView#DomainsView": DomainsView_023709da29c164dc686af2358bd88ee1,
  "@/modules/tenancy/admin/views/BillingView#BillingView": BillingView_0c8006ee12f0cd4ffaa8d33e707b5c89,
  "@/modules/tenancy/admin/views/StaffView#StaffView": StaffView_88420d81c6ae744f4633fdca3bc1ab0c,
  "@/fields/money/RupeeInput#RupeeInput": RupeeInput_7beaa54742b4112c777f1f3f389cd078,
  "@/modules/tenancy/admin/views/SubscriptionBillingField#SubscriptionBillingField": SubscriptionBillingField_fcfef03775b3f583762b352607577092,
  "@/modules/tenancy/admin/views/SubscriptionSummary#SubscriptionSummary": SubscriptionSummary_8c5627b16a26c7886584b3e7212f1e00,
  "@payloadcms/plugin-multi-tenant/client#TenantField": TenantField_1d0591e3cf4f332c83a86da13a0de59a,
  "@payloadcms/plugin-multi-tenant/client#AssignTenantFieldTrigger": AssignTenantFieldTrigger_1d0591e3cf4f332c83a86da13a0de59a,
  "@/admin/graphics/Icon#Icon": Icon_586723811577fcd570b153bacaa81664,
  "@/admin/graphics/Logo#Logo": Logo_fb41377240e79a3f427000f9c4717644,
  "@/admin/nav/PlatformNavLinks#PlatformNavLinks": PlatformNavLinks_05ed6e28c7fd6535d64389b0d8cc4c3b,
  "@payloadcms/plugin-multi-tenant/rsc#TenantSelector": TenantSelector_d6d5f193a167989e2ee7d14202901e62,
  "@payloadcms/plugin-multi-tenant/rsc#TenantSelectionProvider": TenantSelectionProvider_d6d5f193a167989e2ee7d14202901e62,
  "@/admin/views/Dashboard#Dashboard": Dashboard_1892ca63063ac8b0682f63e4a9002f9d,
  "@/modules/tenancy/admin/views/NewVendorView#NewVendorView": NewVendorView_0bb47f900a4c6f1a63052138bef3cd34,
  "@/modules/identity/admin/TeamView#TeamView": TeamView_db3d63515c7821c5d4463c3b81e815eb,
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1
}
