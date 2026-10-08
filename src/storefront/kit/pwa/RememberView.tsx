'use client'

import { useEffect } from 'react'

import { rememberRecent, type RecentProduct } from './recent'

/** Notes a product page as recently viewed, for the offline page */
export function RememberView(props: RecentProduct) {
  const { path, title, price, image } = props
  useEffect(() => {
    rememberRecent({ path, title, price, image })
  }, [path, title, price, image])
  return null
}
