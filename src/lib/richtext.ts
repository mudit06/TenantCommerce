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

export type LexicalDocument = {
  root: {
    type: 'root'
    format: ''
    indent: 0
    version: 1
    direction: 'ltr'
    children: ParagraphNode[]
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
