import type { ReactNode } from 'react'

/** Full-page message: store unavailable or coming soon. */
export function StoreMessage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-alt px-4 text-center">
      <div className="max-w-md">
        <h1 className="font-heading text-2xl font-semibold">{title}</h1>
        <div className="mt-3 text-ink-soft">{children}</div>
      </div>
    </main>
  )
}
