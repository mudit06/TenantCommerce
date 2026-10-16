'use client'

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'

type Chosen = { text: string; setText: (text: string) => void }

const ChosenOptionsContext = createContext<Chosen | null>(null)

/**
 * The finish and size picked in the product page's buy box ("Finish: Rose gold, Size: 8 inch"),
 * for the bulk quote form further down the page, so a quote request names what the shopper chose
 * (docs/10 kit: "The choice travels with the request").
 */
export function ChosenOptionsProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('')
  const value = useMemo(() => ({ text, setText }), [text])
  return <ChosenOptionsContext.Provider value={value}>{children}</ChosenOptionsContext.Provider>
}

/** The buy box's current choice, or null outside a product page. */
export const useChosenOptions = () => useContext(ChosenOptionsContext)
