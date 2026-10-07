import type { AdminViewServerProps } from 'payload'

import { STORE_ADMIN } from '@/access'
import { adminUrl } from '@/admin/paths'
import { requireSignedIn } from '@/admin/session/requireSignedIn'
import { currentStore, storeRolesOf } from '@/admin/store'
import { AdminScreen } from '@/admin/ui/AdminScreen'
import { Card, Notice, Pill } from '@/admin/ui'
import { connectorOverview } from '@/connectors'
import { ConnectorForm } from '@/connectors/admin/ConnectorForm'
import {
  connectorStatus,
  healthLine,
  keysScreenContext,
  problemLine,
} from '@/connectors/admin/storeView'
import { GST_STATES } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'
import type { ShippingZone } from '@/payload-types'

import { storeZones } from '../services/delivery'
import { lookupPincode } from '../services/pincodes'
import { etaText, zoneCoversText, zoneFeeText } from '../services/zones'
import { ShippingZones, type ZoneRow, type ZoneValues } from './ShippingZones'

/** Shipping zones (docs/screens/vendor-cms.md `cms-shipping`): zones, pincode test, Shiprocket. */
export async function ShippingView(view: AdminViewServerProps) {
  return (
    <AdminScreen view={view}>
      <Shipping view={view} />
    </AdminScreen>
  )
}

const READERS = [...STORE_ADMIN, 'order-manager', 'support'] as const

async function Shipping({ view }: { view: AdminViewServerProps }) {
  const { req } = view.initPageResult
  requireSignedIn(req.user, adminUrl.shipping)
  const store = await currentStore(req.payload, req.user)
  if (!store) {
    return (
      <div className="te-page">
        <Notice tone="info">Open a store to see its shipping zones.</Notice>
      </div>
    )
  }
  const roles = storeRolesOf(req.user, store.id)
  if (!roles.some((role) => (READERS as readonly string[]).includes(role))) {
    return (
      <div className="te-page">
        <Notice tone="danger">Only owners and managers see shipping zones.</Notice>
      </div>
    )
  }
  const canEdit = roles.some((role) => STORE_ADMIN.includes(role))
  const [zones, { connectors }, keys] = await Promise.all([
    storeZones(req.payload, store.id),
    connectorOverview(req.payload, store.id),
    keysScreenContext(view, adminUrl.shipping),
  ])
  const shiprocket = connectors.find((row) => row.provider.key === 'shiprocket')!
  const pickup = shiprocket.publicValues.pickupPincode
  const subtitle = await shipsFrom(view, store.id, pickup)
  const status = connectorStatus(shiprocket)
  const connected = shiprocket.connected && shiprocket.availability.allowed

  return (
    <ShippingZones
      canEdit={canEdit}
      rows={zones.map(toRow)}
      states={Object.entries(GST_STATES).map(([code, name]) => ({ code, name }))}
      storeId={store.id}
      subtitle={subtitle}
    >
      <div className="te-notice te-notice--info" role="status">
        {connected ? (
          <>
            <strong>Shiprocket connected (your own account).</strong> Delivery fees at checkout are
            Shiprocket’s live courier rates, with COD and delivery dates per pincode; if Shiprocket
            can’t answer, the zones above are used. Your zones still decide where you deliver, where
            COD is allowed and the free-delivery amount. Book parcels from the order screen for AWB
            labels, pickups and tracking. Manual shipping stays for your own vans or couriers.
          </>
        ) : (
          <>
            Delivery fees come from the zones above. Connect Shiprocket to charge live courier
            rates, print AWB labels, book pickups and track parcels automatically.
          </>
        )}
      </div>
      <Card>
        {!shiprocket.availability.allowed ? (
          <Notice tone="info">
            Shiprocket isn’t switched on for this store. Your platform contact can switch it on when
            your plan allows it.
          </Notice>
        ) : keys.canSee ? (
          <ConnectorForm
            canEdit={keys.canEdit}
            fields={shiprocket.provider.fields}
            healthLine={healthLine(shiprocket)}
            label="Shiprocket"
            mode={shiprocket.mode}
            problem={problemLine(shiprocket)}
            providerKey="shiprocket"
            savedSecrets={shiprocket.savedSecrets}
            status={status}
            tenantId={store.id}
            values={shiprocket.publicValues}
            webhookHelp={
              <>
                In Shiprocket, open Settings, API, Webhooks, paste this address and the token, and
                switch tracking updates on.
              </>
            }
            webhookToken={shiprocket.webhookToken}
            webhookTokenLabel="Token (x-api-key) to paste with it"
            webhookUrl={shiprocket.webhookUrl}
          />
        ) : (
          <p className="te-muted">
            <strong>Shiprocket</strong> <Pill tone={status.tone}>{status.label}</Pill>{' '}
            {healthLine(shiprocket) ?? 'Only the store owner sees and changes the Shiprocket keys.'}
          </p>
        )}
      </Card>
    </ShippingZones>
  )
}

/** "Ships from Morbi, Gujarat 363642": Shiprocket's pickup pincode, else the registered address */
async function shipsFrom(
  view: AdminViewServerProps,
  storeId: string,
  pickup: string | undefined,
): Promise<string | null> {
  const { payload } = view.initPageResult.req
  if (pickup) {
    const place = await lookupPincode(payload, pickup)
    return `Ships from ${[place.city, place.stateName, pickup].filter(Boolean).join(', ')}`
  }
  const tenant = await payload
    .findByID({ collection: 'tenants', id: storeId, depth: 0, overrideAccess: true })
    .catch(() => null)
  const address = tenant?.registeredAddress
  if (!address?.city && !address?.pincode) return null
  const state = address.stateCode ? GST_STATES[address.stateCode as keyof typeof GST_STATES] : null
  return `Ships from ${[address.city, state, address.pincode].filter(Boolean).join(', ')}`
}

function toRow(zone: ShippingZone): ZoneRow {
  const freeAbove = zone.freeAbove?.amountMinor
  const values: ZoneValues = {
    name: zone.name,
    isServiceable: zone.isServiceable !== false,
    states: (zone.states ?? []) as string[],
    pincodePrefixes: zone.pincodePrefixes ?? [],
    rateType: (zone.rateType ?? 'flat') as ZoneValues['rateType'],
    feeMinor: zone.fee?.amountMinor ?? null,
    freeAboveMinor: freeAbove ?? null,
    baseWeightGrams: zone.baseWeightGrams ?? null,
    perExtraKgMinor: zone.perExtraKg?.amountMinor ?? null,
    valueBrackets: (zone.valueBrackets ?? []).map((row) => ({
      fromMinor: row.from?.amountMinor ?? 0,
      feeMinor: row.bracketFee?.amountMinor ?? 0,
    })),
    codAllowed: zone.codAllowed !== false,
    etaMinDays: zone.etaMinDays ?? null,
    etaMaxDays: zone.etaMaxDays ?? null,
  }
  return {
    id: String(zone.id),
    name: zone.name,
    covers: zoneCoversText(zone),
    fee: zoneFeeText(zone),
    freeAbove: freeAbove ? formatINR(freeAbove) : null,
    serviceable: values.isServiceable,
    cod: values.codAllowed,
    eta: etaText(zone.etaMinDays, zone.etaMaxDays),
    values,
  }
}
