'use client'

import { useEffect, useState } from 'react'

import { buttonClass } from '../ui'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> }

const VISITS = 'te_visits'
const DISMISSED = 'te_install_dismissed'

const store = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Storage off: the banner just shows again
    }
  },
}

/**
 * Registers the store's service worker (production only) and offers "Install" from the second
 * visit (docs/13 "Install prompt"); iPhones get the Share, Add to Home Screen hint instead.
 * "Not now" is remembered.
 */
export function PwaSetup({ storeName, icon }: { storeName: string; icon: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
    const visits = Number(store.get(VISITS) ?? 0) + 1
    store.set(VISITS, String(visits))
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone || visits < 2 || store.get(DISMISSED)) return
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)
    const timer = isIos ? window.setTimeout(() => setIos(true), 0) : undefined
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  if (!prompt && !ios) return null
  const close = () => {
    store.set(DISMISSED, '1')
    setPrompt(null)
    setIos(false)
  }
  return (
    <div
      aria-label={`Install ${storeName}`}
      className="fixed inset-x-3 bottom-20 z-40 flex items-center gap-3 rounded-card border border-line bg-white p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:w-96 lg:bottom-4"
      role="dialog"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="size-12 rounded-lg" src={icon} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Install {storeName}</p>
        <p className="text-xs text-ink-soft">
          {prompt
            ? 'Open the store like an app.'
            : 'On iPhone: tap Share, then Add to Home Screen.'}
        </p>
      </div>
      {prompt ? (
        <button
          className={buttonClass('primary', 'min-h-9 px-3')}
          onClick={async () => {
            await prompt.prompt()
            await prompt.userChoice.catch(() => undefined)
            close()
          }}
          type="button"
        >
          Install
        </button>
      ) : null}
      <button className="min-h-9 px-2 text-sm text-ink-soft" onClick={close} type="button">
        Not now
      </button>
    </div>
  )
}
