import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getStoreContext } from '@/storefront/context'
import { LoginForm } from '@/storefront/kit/account/LoginForm'
import { CheckIcon } from '@/storefront/kit/icons'
import { Container } from '@/storefront/kit/ui'
import { safeNext, signedInShopper } from '@/storefront/shop/account'

export const metadata: Metadata = { title: 'Log in', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ next?: string; email?: string }>
}

const BENEFITS = ['Track orders and download invoices', 'Check out faster with saved addresses']

/** Log in with a code (docs/screens storefront `st-login`). The account is this store's only. */
export default async function LoginPage({ params, searchParams }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const { next, email } = await searchParams
  if (await signedInShopper(ctx.store.tenantId)) redirect(safeNext(next))
  const storeName = ctx.settings?.storeName ?? ctx.store.name
  return (
    <Container className="py-8 sm:py-14">
      <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2">
        <div className="hidden rounded-card bg-surface-alt p-8 md:block">
          <p className="font-heading text-2xl font-bold">{storeName}</p>
          <p className="mt-2 text-ink-soft">Your account with {storeName}.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {BENEFITS.map((text) => (
              <li className="flex items-center gap-2" key={text}>
                <CheckIcon aria-hidden height={16} width={16} />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-line bg-white p-5 sm:p-7">
          <LoginForm initialEmail={email ?? ''} next={safeNext(next)} />
        </div>
      </div>
    </Container>
  )
}
