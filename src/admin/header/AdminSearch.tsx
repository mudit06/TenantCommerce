'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { Icon } from '@/admin/ui/icons'

type Target = { label: string; href: string }

/**
 * Top bar search (wireframe "Search products, orders, customers", Ctrl K). Opens the chosen list
 * with Payload's own search applied, so results follow the same access rules as the list.
 */
export function AdminSearch({ targets }: { targets: Target[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const term = query.trim()
  const go = (target: Target | undefined) => {
    if (!target || !term) return
    setOpen(false)
    router.push(`${target.href}?search=${encodeURIComponent(term)}`)
  }
  const showList = open && term.length > 0

  return (
    <div className="te-search">
      <Icon name="search" size={15} />
      <input
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showList}
        aria-label={`Search ${targets.map((target) => target.label.toLowerCase()).join(', ')}`}
        className="te-search__input"
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((index) => (index + 1) % targets.length)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => (index - 1 + targets.length) % targets.length)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            go(targets[active])
          } else if (event.key === 'Escape') {
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        placeholder={`Search ${targets.map((target) => target.label.toLowerCase()).join(', ')}`}
        ref={inputRef}
        role="combobox"
        type="search"
        value={query}
      />
      <kbd className="te-search__kbd">Ctrl K</kbd>
      {showList ? (
        <ul className="te-search__list" id={listId} role="listbox">
          {targets.map((target, index) => (
            <li
              aria-selected={index === active}
              className={index === active ? 'te-search__option--active' : undefined}
              id={`${listId}-${index}`}
              key={target.href}
              onMouseDown={(event) => {
                event.preventDefault()
                go(target)
              }}
              onMouseEnter={() => setActive(index)}
              role="option"
            >
              <span className="te-muted">{target.label}</span> matching “{term}”
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
