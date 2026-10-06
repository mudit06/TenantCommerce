'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { confirmPayment, retryPayment } from '@/storefront/shop/actions'

import { buttonClass } from '../ui'

/** "Complete payment" for an online order whose payment window was closed (held 30 minutes). */
export function RetryPayment({
  orderNumber,
  themeColor,
}: {
  orderNumber: string
  themeColor: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pay = async () => {
    setBusy(true)
    setError(null)
    const result = await retryPayment(orderNumber)
    if (!result.ok || !result.data.payment) {
      setBusy(false)
      setError(result.ok ? 'This order can’t be paid any more.' : result.message)
      return
    }
    const payment = result.data.payment
    if (!window.Razorpay) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve()
        script.onerror = () => resolve()
        document.body.appendChild(script)
      })
    }
    if (!window.Razorpay) {
      setBusy(false)
      setError('The payment window couldn’t load. Check your connection and try again.')
      return
    }
    new window.Razorpay({
      key: payment.keyId,
      amount: payment.amountMinor,
      currency: payment.currency,
      name: payment.storeName,
      description: `Order ${orderNumber}`,
      order_id: payment.razorpayOrderId,
      prefill: payment.prefill,
      theme: { color: themeColor },
      handler: async (response: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
      }) => {
        await confirmPayment({ orderNumber, ...response })
        router.refresh()
      },
      modal: { ondismiss: () => setBusy(false) },
    }).open()
  }
  return (
    <div>
      <button
        className={buttonClass('dark', 'w-full')}
        disabled={busy}
        onClick={() => void pay()}
        type="button"
      >
        {busy ? 'Opening payment…' : 'Complete payment'}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
