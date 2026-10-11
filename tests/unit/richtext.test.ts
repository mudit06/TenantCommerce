import { describe, expect, it } from 'vitest'

import { outlineToLexical } from '@/lib/richtext'

describe('outline to rich text (policy pages written in code)', () => {
  it('makes headings, bulleted lists and paragraphs', () => {
    const doc = outlineToLexical(
      [
        'Intro line',
        '',
        '## What we collect',
        '- Name',
        '- Phone',
        '### Cookies',
        'Last line',
      ].join('\n'),
    )
    const nodes = doc.root.children
    expect(nodes.map((n) => n.type)).toEqual([
      'paragraph',
      'heading',
      'list',
      'heading',
      'paragraph',
    ])
    expect(nodes[1]).toMatchObject({ type: 'heading', tag: 'h2' })
    expect(nodes[3]).toMatchObject({ type: 'heading', tag: 'h3' })
    const list = nodes[2]
    expect(list?.type === 'list' && list.children.map((item) => item.children[0]?.text)).toEqual([
      'Name',
      'Phone',
    ])
    expect(list?.type === 'list' && list.children.map((item) => item.value)).toEqual([1, 2])
  })

  it('starts a new list after a paragraph and reads Windows line ends', () => {
    const doc = outlineToLexical('- A\r\nText\r\n- B')
    expect(doc.root.children.map((n) => n.type)).toEqual(['list', 'paragraph', 'list'])
  })
})
