import { randomInt } from 'node:crypto'

import type { PayloadRequest } from 'payload'

import { nextNumber } from '@/modules/tax-invoicing'

/** Order numbers start here so the first order reads AQV-10001, not AQV-1 */
const FIRST_ORDER = 10_000

/** `<orderPrefix>-<counter>`, e.g. AQV-10482 (docs/06). Sequential, so never a key by itself. */
export async function nextOrderNumber(req: PayloadRequest, tenantId: string, prefix: string) {
  return `${prefix}-${FIRST_ORDER + (await nextNumber(req, tenantId, 'order'))}`
}

// No 0/O or 1/I/L, so a code read over the phone can't be mistaken
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** The random part of the /t/<code> tracking link in messages (docs/06 `trackingCode`). */
export function newTrackingCode(length = 10): string {
  let code = ''
  for (let i = 0; i < length; i += 1) code += CODE_CHARS[randomInt(CODE_CHARS.length)]
  return code
}
