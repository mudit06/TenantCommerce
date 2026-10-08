import type { MilestoneKey } from '../milestones'
import type { VariableKey } from '../variables'

// Starter library (docs/18 "Templates"): English wording written to pass Meta's utility review.
// Order facts only, never offers, so Meta keeps them in the cheap utility category. The body
// never starts or ends with a variable. `<Store>` is filled in once per vendor before it is
// submitted; numbered variables are filled per message.

export type Variant = 'default' | 'prepaid' | 'cod'

export type StarterWhatsApp = {
  body: string
  /** Variable keys for {{1}}, {{2}}… in order */
  variables: VariableKey[]
  /** "Track order" URL button: https://<store>/t/{{1}} */
  trackButton: boolean
}

export type StarterEmail = {
  subject: string
  /** Paragraphs; `{customer.firstName}` style placeholders */
  paragraphs: string[]
  /** Heading above the button */
  heading: string
}

type Starter = { whatsapp: StarterWhatsApp; email: StarterEmail }

const wa = (body: string, variables: VariableKey[], trackButton = true): StarterWhatsApp => ({
  body,
  variables,
  trackButton,
})

export const STARTER_TEMPLATES: Record<MilestoneKey, Partial<Record<Variant, Starter>>> = {
  order_confirmed: {
    prepaid: {
      whatsapp: wa(
        'Hi {{1}}, thank you for your order {{2}} at <Store>.\nWe have received your payment of {{3}} for {{4}}.\nWe will message you here when it ships.',
        ['customer.firstName', 'order.number', 'order.total', 'order.itemSummary'],
      ),
      email: {
        subject: 'Order {order.number} confirmed',
        heading: 'Thank you for your order',
        paragraphs: [
          'Hi {customer.firstName}, we have received your order {order.number} and your payment of {order.total}.',
          'We will email you again when it ships.',
        ],
      },
    },
    cod: {
      whatsapp: wa(
        'Hi {{1}}, thank you for your order {{2}} at <Store>.\nPlease keep {{3}} ready to pay in cash on delivery.\nWe will message you here when it ships.',
        ['customer.firstName', 'order.number', 'order.total'],
      ),
      email: {
        subject: 'Order {order.number} confirmed',
        heading: 'Thank you for your order',
        paragraphs: [
          'Hi {customer.firstName}, we have received your order {order.number}.',
          'Please keep {order.total} ready to pay in cash when it is delivered. We will email you again when it ships.',
        ],
      },
    },
  },
  shipment_packed: {
    default: {
      whatsapp: wa(
        'Hi {{1}}, your <Store> order {{2}} is packed and will ship soon.\nWe will send the tracking number once the courier collects it.',
        ['customer.firstName', 'order.number'],
      ),
      email: {
        subject: 'Order {order.number} is packed',
        heading: 'Your order is packed',
        paragraphs: [
          'Hi {customer.firstName}, your order {order.number} is packed and will ship soon.',
        ],
      },
    },
  },
  shipment_shipped: {
    default: {
      whatsapp: wa(
        'Hi {{1}}, your <Store> order {{2}} has shipped with {{3}}.\nTracking number: {{4}}\nExpected delivery: {{5}}\nWe will message you again when it is out for delivery.',
        [
          'customer.firstName',
          'order.number',
          'shipment.courier',
          'shipment.trackingNumber',
          'shipment.expectedDate',
        ],
      ),
      email: {
        subject: 'Order {order.number} has shipped',
        heading: 'Your order is on its way',
        paragraphs: [
          'Hi {customer.firstName}, your order {order.number} has shipped with {shipment.courier}.',
          'Tracking number: {shipment.trackingNumber}. Expected delivery: {shipment.expectedDate}.',
        ],
      },
    },
  },
  shipment_in_transit: {
    default: {
      whatsapp: wa(
        'Hi {{1}}, your <Store> order {{2}} is on its way with {{3}}.\nExpected delivery: {{4}}.',
        ['customer.firstName', 'order.number', 'shipment.courier', 'shipment.expectedDate'],
      ),
      email: {
        subject: 'Order {order.number} is on its way',
        heading: 'Your order is on its way',
        paragraphs: [
          'Hi {customer.firstName}, your order {order.number} is moving with {shipment.courier}. Expected delivery: {shipment.expectedDate}.',
        ],
      },
    },
  },
  shipment_out_for_delivery: {
    prepaid: {
      whatsapp: wa(
        'Hi {{1}}, your <Store> order {{2}} is out for delivery today.\nPlease keep your phone handy for the courier.',
        ['customer.firstName', 'order.number'],
      ),
      email: {
        subject: 'Order {order.number} arrives today',
        heading: 'Out for delivery today',
        paragraphs: [
          'Hi {customer.firstName}, your order {order.number} is out for delivery today. Please keep your phone handy for the courier.',
        ],
      },
    },
    cod: {
      whatsapp: wa(
        'Hi {{1}}, your <Store> order {{2}} is out for delivery today.\nPlease keep ₹{{3}} ready, as it is cash on delivery.',
        ['customer.firstName', 'order.number', 'order.codDue'],
      ),
      email: {
        subject: 'Order {order.number} arrives today',
        heading: 'Out for delivery today',
        paragraphs: [
          'Hi {customer.firstName}, your order {order.number} is out for delivery today.',
          'Please keep ₹{order.codDue} ready, as it is cash on delivery.',
        ],
      },
    },
  },
  shipment_delivery_failed: {
    default: {
      whatsapp: wa(
        'Hi {{1}}, the courier could not deliver your <Store> order {{2}} today because {{3}}.\nThey will try again soon. For help, contact {{4}}.',
        ['customer.firstName', 'order.number', 'shipment.failureReason', 'store.help'],
      ),
      email: {
        subject: 'We couldn’t deliver order {order.number}',
        heading: 'Delivery didn’t happen today',
        paragraphs: [
          'Hi {customer.firstName}, the courier could not deliver your order {order.number} today because {shipment.failureReason}.',
          'They will try again soon. For help, contact {store.help}.',
        ],
      },
    },
  },
  shipment_delivered: {
    default: {
      whatsapp: wa(
        'Hi {{1}}, your <Store> order {{2}} has been delivered.\nYour invoice is on the order page. Thank you for shopping with us.',
        ['customer.firstName', 'order.number'],
      ),
      email: {
        subject: 'Order {order.number} delivered',
        heading: 'Delivered',
        paragraphs: [
          'Hi {customer.firstName}, your order {order.number} has been delivered.',
          'Your invoice is on the order page. Thank you for shopping with us.',
        ],
      },
    },
  },
  order_cancelled: {
    prepaid: {
      whatsapp: wa(
        'Hi {{1}}, your <Store> order {{2}} has been cancelled.\nYour refund of {{3}} will reach your account in 5 to 7 working days.',
        ['customer.firstName', 'order.number', 'order.total'],
      ),
      email: {
        subject: 'Order {order.number} cancelled',
        heading: 'Your order is cancelled',
        paragraphs: [
          'Hi {customer.firstName}, your order {order.number} has been cancelled.',
          'Your refund of {order.total} will reach your account in 5 to 7 working days.',
        ],
      },
    },
    cod: {
      whatsapp: wa(
        'Hi {{1}}, your <Store> order {{2}} has been cancelled.\nNothing is due from you. For help, contact {{3}}.',
        ['customer.firstName', 'order.number', 'store.help'],
      ),
      email: {
        subject: 'Order {order.number} cancelled',
        heading: 'Your order is cancelled',
        paragraphs: [
          'Hi {customer.firstName}, your order {order.number} has been cancelled. Nothing is due from you.',
          'For help, contact {store.help}.',
        ],
      },
    },
  },
  refund_processed: {
    default: {
      whatsapp: wa(
        'Hi {{1}}, we have refunded {{2}} for your <Store> order {{3}}.\nReference: {{4}}\nIt usually reaches your account in 5 to 7 working days.',
        ['customer.firstName', 'refund.amount', 'order.number', 'refund.reference'],
      ),
      email: {
        subject: 'Refund for order {order.number}',
        heading: 'Your refund is on its way',
        paragraphs: [
          'Hi {customer.firstName}, we have refunded {refund.amount} for your order {order.number} (reference {refund.reference}).',
          'It usually reaches your account in 5 to 7 working days.',
        ],
      },
    },
  },
  return_approved: {
    default: {
      whatsapp: wa(
        'Hi {{1}}, your return for <Store> order {{2}} is approved.\nWe will share the pickup details shortly.',
        ['customer.firstName', 'order.number'],
      ),
      email: {
        subject: 'Return approved for order {order.number}',
        heading: 'Return approved',
        paragraphs: [
          'Hi {customer.firstName}, your return for order {order.number} is approved.',
          '{return.instructions}',
        ],
      },
    },
  },
  return_rejected: {
    default: {
      whatsapp: wa(
        'Hi {{1}}, we could not accept the return for <Store> order {{2}}.\nFor help, contact {{3}}.',
        ['customer.firstName', 'order.number', 'store.help'],
      ),
      email: {
        subject: 'Return for order {order.number}',
        heading: 'We couldn’t accept the return',
        paragraphs: [
          'Hi {customer.firstName}, we could not accept the return for order {order.number}: {return.reason}. For help, contact {store.help}.',
        ],
      },
    },
  },
}

/** The starter for a step, the variant if it has one, else its default wording */
export function starterFor(milestone: MilestoneKey, variant: Variant): Starter {
  const set = STARTER_TEMPLATES[milestone]
  const found = set[variant] ?? set.default ?? Object.values(set)[0]
  if (!found) throw new Error(`No starter template for ${milestone}`)
  return found
}

/** Meta template names: lowercase letters, digits and underscores */
export const whatsappTemplateName = (milestone: MilestoneKey, variant: Variant) =>
  variant === 'default' ? milestone : `${milestone}_${variant}`

/** The text with the store's name filled in, as submitted to Meta */
export const withStoreName = (body: string, storeName: string) =>
  body.replace(/<Store>/g, storeName.replace(/[\r\n]+/g, ' ').trim())
