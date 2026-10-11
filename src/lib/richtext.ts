// Minimal Lexical documents for content we create in code (placeholder policy pages). Staff edit
// them in the rich text editor like any other content.

type TextNode = {
  type: 'text'
  text: string
  format: number
  detail: number
  mode: 'normal'
  style: string
  version: 1
}

type ParagraphNode = {
  type: 'paragraph'
  format: ''
  indent: 0
  version: 1
  direction: 'ltr'
  textFormat: 0
  children: TextNode[]
}

type HeadingNode = Omit<ParagraphNode, 'type' | 'textFormat'> & {
  type: 'heading'
  tag: 'h2' | 'h3'
}
type ListItemNode = Omit<ParagraphNode, 'type' | 'textFormat'> & { type: 'listitem'; value: number }
type ListNode = Omit<ParagraphNode, 'type' | 'textFormat' | 'children'> & {
  type: 'list'
  listType: 'bullet'
  tag: 'ul'
  start: 1
  children: ListItemNode[]
}

export type LexicalDocument = {
  root: {
    type: 'root'
    format: ''
    indent: 0
    version: 1
    direction: 'ltr'
    children: (ParagraphNode | HeadingNode | ListNode)[]
  }
}

/** One paragraph per line of `text`. */
export function plainTextToLexical(text: string): LexicalDocument {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: text.split('\n').map((line) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children: line
          ? [
              {
                type: 'text',
                text: line,
                format: 0,
                detail: 0,
                mode: 'normal',
                style: '',
                version: 1,
              },
            ]
          : [],
      })),
    },
  }
}

const textNode = (text: string): TextNode => ({
  type: 'text',
  text,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})
const block = { format: '', indent: 0, version: 1, direction: 'ltr' } as const

/**
 * Longer content written in code (policy pages): "## " and "### " lines become headings, "- "
 * lines a bulleted list, other lines paragraphs; blank lines are skipped.
 */
export function outlineToLexical(text: string): LexicalDocument {
  const children: LexicalDocument['root']['children'] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const heading = line.match(/^(#{2,3}) (.+)$/)
    if (heading) {
      children.push({
        ...block,
        type: 'heading',
        tag: heading[1] === '##' ? 'h2' : 'h3',
        children: [textNode(heading[2]!)],
      })
      continue
    }
    if (line.startsWith('- ')) {
      const last = children.at(-1)
      const list: ListNode =
        last?.type === 'list'
          ? last
          : { ...block, type: 'list', listType: 'bullet', tag: 'ul', start: 1, children: [] }
      if (list !== last) children.push(list)
      list.children.push({
        ...block,
        type: 'listitem',
        value: list.children.length + 1,
        children: [textNode(line.slice(2))],
      })
      continue
    }
    children.push({ ...block, type: 'paragraph', textFormat: 0, children: [textNode(line)] })
  }
  return { root: { type: 'root', ...block, children } }
}
