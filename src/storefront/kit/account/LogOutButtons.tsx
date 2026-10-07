'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { logOut } from '../../shop/accountActions'

/** "Log out" and "Log out of all devices" (docs/screens My account rule 3). */
export function LogOutButtons({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (everywhere: boolean) =>
    start(async () => {
      await logOut(everywhere)
      router.replace('/')
      router.refresh()
    })
  return (
    <div className={className}>
      <button
        className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-surface-alt"
        disabled={pending}
        onClick={() => run(false)}
        type="button"
      >
        Log out
      </button>
      <button
        className="block w-full rounded-md px-3 py-2 text-left text-sm text-ink-soft hover:bg-surface-alt"
        disabled={pending}
        onClick={() => run(true)}
        type="button"
      >
        Log out of all devices
      </button>
    </div>
  )
}
