'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState, type DragEvent, type KeyboardEvent } from 'react'

import { callApi } from '@/admin/client/api'
import { adminUrl } from '@/admin/paths'
import { Icon } from '@/admin/ui/icons'

export type TreeItem = {
  id: string
  name: string
  parent: string | null
  depth: number
  count: number
  visible: boolean
}

type Drop = { id: string; where: 'before' | 'after' | 'inside' }

/**
 * The category tree (docs/screens/vendor-cms.md `cms-categories`): drag a category to reorder
 * it or drop it on another to nest it; Alt + arrow keys do the same from the keyboard. The order
 * is the order of menus and category tiles.
 */
export function CategoryTree({
  nodes,
  currentId,
  canWrite,
}: {
  nodes: TreeItem[]
  currentId?: string
  canWrite: boolean
}) {
  const router = useRouter()
  const [dragging, setDragging] = useState<string | null>(null)
  const [drop, setDrop] = useState<Drop | null>(null)
  const [busy, setBusy] = useState(false)
  const [closed, setClosed] = useState<Set<string>>(new Set())

  const childrenOf = (id: string | null) => nodes.filter((n) => n.parent === id)
  const hasChildren = (id: string) => nodes.some((n) => n.parent === id)
  const hiddenByParent = (node: TreeItem): boolean => {
    for (let parent = node.parent; parent;) {
      if (closed.has(parent)) return true
      parent = nodes.find((n) => n.id === parent)?.parent ?? null
    }
    return false
  }

  const move = async (id: string, parent: string | null, index: number) => {
    setBusy(true)
    const result = await callApi(`/admin/v1/catalog/categories/${id}/move`, {
      body: { parent, index },
    })
    setBusy(false)
    if (!result.ok) return toast.error(result.error.message)
    router.refresh()
  }

  const siblingIndex = (node: TreeItem, without?: string) =>
    childrenOf(node.parent)
      .filter((n) => n.id !== without)
      .findIndex((n) => n.id === node.id)

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    const target = drop && nodes.find((n) => n.id === drop.id)
    const moving = dragging
    setDrop(null)
    setDragging(null)
    if (!target || !moving || target.id === moving) return
    if (drop.where === 'inside') {
      void move(moving, target.id, childrenOf(target.id).length)
      return
    }
    const index = siblingIndex(target, moving) + (drop.where === 'after' ? 1 : 0)
    void move(moving, target.parent, index)
  }

  const onKey = (event: KeyboardEvent, node: TreeItem) => {
    if (!canWrite || !event.altKey || busy) return
    const siblings = childrenOf(node.parent)
    const index = siblings.findIndex((n) => n.id === node.id)
    if (event.key === 'ArrowUp' && index > 0) void move(node.id, node.parent, index - 1)
    else if (event.key === 'ArrowDown' && index < siblings.length - 1)
      void move(node.id, node.parent, index + 1)
    else if (event.key === 'ArrowRight' && index > 0) {
      // Under the category above it
      const above = siblings[index - 1]!
      void move(node.id, above.id, childrenOf(above.id).length)
    } else if (event.key === 'ArrowLeft' && node.parent) {
      const parent = nodes.find((n) => n.id === node.parent)!
      void move(node.id, parent.parent, siblingIndex(parent) + 1)
    } else return
    event.preventDefault()
  }

  if (!nodes.length) return <p className="te-muted te-small">No categories yet.</p>

  return (
    <div className={`te-tree${busy ? ' te-tree--busy' : ''}`}>
      <ul aria-label="Categories" className="te-tree__list" role="tree">
        {nodes.map((node) => {
          if (hiddenByParent(node)) return null
          const isDrop = drop?.id === node.id
          return (
            <li
              aria-current={node.id === currentId ? 'page' : undefined}
              aria-level={node.depth + 1}
              aria-selected={node.id === currentId}
              className={[
                'te-tree__node',
                node.id === currentId ? 'te-tree__node--current' : '',
                node.id === dragging ? 'te-tree__node--dragging' : '',
                isDrop ? `te-tree__node--drop-${drop.where}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
              draggable={canWrite && !busy}
              key={node.id}
              onDragEnd={() => {
                setDragging(null)
                setDrop(null)
              }}
              onDragOver={(event) => {
                if (!dragging || dragging === node.id) return
                event.preventDefault()
                const box = event.currentTarget.getBoundingClientRect()
                const y = (event.clientY - box.top) / box.height
                const where = y < 0.28 ? 'before' : y > 0.72 ? 'after' : 'inside'
                if (drop?.id !== node.id || drop.where !== where) setDrop({ id: node.id, where })
              }}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', node.id)
                setDragging(node.id)
              }}
              onDrop={onDrop}
              role="treeitem"
              style={{ paddingLeft: 8 + node.depth * 18 }}
            >
              {canWrite ? (
                <span aria-hidden className="te-tree__handle" title="Drag to move">
                  ⋮⋮
                </span>
              ) : null}
              {hasChildren(node.id) ? (
                <button
                  aria-expanded={!closed.has(node.id)}
                  aria-label={`${closed.has(node.id) ? 'Open' : 'Close'} ${node.name}`}
                  className="te-tree__toggle"
                  onClick={() =>
                    setClosed((current) => {
                      const next = new Set(current)
                      if (next.has(node.id)) next.delete(node.id)
                      else next.add(node.id)
                      return next
                    })
                  }
                  type="button"
                >
                  <Icon name={closed.has(node.id) ? 'chevronRight' : 'chevronDown'} size={13} />
                </button>
              ) : (
                <span aria-hidden className="te-tree__toggle" />
              )}
              <a
                className="te-tree__name"
                draggable={false}
                href={adminUrl.doc('categories', node.id)}
                onKeyDown={(event) => onKey(event, node)}
              >
                {node.name}
                {node.visible ? null : <span className="te-muted te-small"> · hidden</span>}
              </a>
              <span
                className="te-tree__count te-mono"
                title="Products here and in its subcategories"
              >
                {node.count.toLocaleString('en-IN')}
              </span>
            </li>
          )
        })}
      </ul>
      {canWrite ? (
        <p className="te-muted te-small">
          Drag to reorder, or onto another category to nest it. Keyboard: Alt + arrow keys.
        </p>
      ) : null}
    </div>
  )
}
