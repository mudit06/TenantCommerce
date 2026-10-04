'use client'

import { useRowLabel } from '@payloadcms/ui'

import { Icon } from '@/admin/ui/icons'

import { BLOCK_META } from '../meta'

/**
 * A block's row on the page canvas: its position, type and what it says ("Hero slider ·
 * Bathrooms that last a lifetime"), so the page's structure reads at a glance while collapsed.
 */
export function BlockLabel() {
  const { data, rowNumber } = useRowLabel<Record<string, unknown>>()
  const type = typeof data?.blockType === 'string' ? data.blockType : ''
  const meta = BLOCK_META[type]
  const summary = data ? meta?.summary(data) : undefined
  const named =
    typeof data?.blockName === 'string' && data.blockName.trim() ? data.blockName : undefined
  return (
    <span className="te-block-label">
      <span className="te-block-label__number">
        {String((rowNumber ?? 0) + 1).padStart(2, '0')}
      </span>
      {meta ? (
        <span aria-hidden className="te-block-label__icon">
          <Icon name={meta.icon} size={15} />
        </span>
      ) : null}
      <span className="te-block-label__type">{meta?.label ?? type}</span>
      <span
        className={`te-block-label__summary${summary || named ? '' : ' te-block-label__summary--hint'}`}
      >
        {named ?? summary ?? meta?.description}
      </span>
    </span>
  )
}
