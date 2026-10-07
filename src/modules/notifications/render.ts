import { orderUpdateEmail } from '@/emails/orderUpdate'

import type { MilestoneKey } from './milestones'
import { starterFor, type Variant, withStoreName } from './starter-templates'
import {
  fillNamed,
  fillNumbered,
  type MessageFacts,
  messageVariables,
  type VariableKey,
} from './variables'

// One message as the shopper sees it, from the facts (docs/18 "How a message is sent"). Used by
// the send job, the Order updates preview and test sends, so all three say the same thing.

export type TemplateText = { body: string; variables: VariableKey[]; trackButton: boolean }

export type RenderedWhatsApp = {
  text: string
  bodyParams: string[]
  /** The "Track order" button's variable: the tracking code */
  buttonParam: string | null
  trackUrl: string
}

export function renderWhatsApp(
  milestone: MilestoneKey,
  variant: Variant,
  facts: MessageFacts,
  template?: TemplateText | null,
): RenderedWhatsApp {
  const starter = starterFor(milestone, variant).whatsapp
  const source = template ?? {
    body: withStoreName(starter.body, facts.storeName),
    variables: starter.variables,
    trackButton: starter.trackButton,
  }
  const values = messageVariables(facts)
  const bodyParams = source.variables.map((key) => values[key] ?? '')
  return {
    text: fillNumbered(source.body, bodyParams),
    bodyParams,
    buttonParam: source.trackButton ? values['links.trackCode'] : null,
    trackUrl: values['links.track'],
  }
}

export function renderEmail(
  milestone: MilestoneKey,
  variant: Variant,
  facts: MessageFacts & { themeColor?: string | null },
) {
  const starter = starterFor(milestone, variant).email
  const values = messageVariables(facts)
  const help = [facts.supportPhone, facts.supportEmail].filter(Boolean).join(' or ')
  return orderUpdateEmail({
    storeName: facts.storeName,
    subject: fillNamed(starter.subject, values),
    heading: fillNamed(starter.heading, values),
    paragraphs: starter.paragraphs.map((p) => fillNamed(p, values)),
    trackUrl: values['links.track'],
    orderNumber: facts.order.number,
    themeColor: facts.themeColor,
    supportLine: help ? `Questions? Contact ${facts.storeName} at ${help}.` : null,
  })
}

/** A sample order for the preview and "Send test": nobody real, the store's own name and link */
export function sampleFacts(
  store: {
    storeName: string
    storeOrigin: string
    supportPhone?: string | null
    supportEmail?: string | null
    orderPrefix?: string | null
  },
  variant: Variant,
): MessageFacts {
  const cod = variant === 'cod'
  return {
    storeName: store.storeName,
    storeOrigin: store.storeOrigin,
    supportPhone: store.supportPhone,
    supportEmail: store.supportEmail,
    order: {
      number: `${store.orderPrefix || 'ORD'}-10482`,
      customerName: 'Rahul Kulkarni',
      totalMinor: 2_364_000,
      paymentMethod: cod ? 'cod' : 'razorpay',
      items: [
        { title: 'Aria single-lever basin mixer', qty: 1 },
        { title: 'Nimbus wall-hung WC', qty: 1 },
      ],
      trackingCode: 'K7Q2M9XW4P',
      codDueMinor: cod ? 2_364_000 : 0,
    },
    shipment: {
      courier: 'Delhivery',
      trackingNumber: '1490 2210 0458',
      expectedDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      failureReason: 'customer_unavailable',
      codAmountMinor: cod ? 2_364_000 : 0,
    },
    refund: { amountMinor: 2_364_000, reference: 'rfnd_Q7x2Lm' },
  }
}
