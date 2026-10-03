import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

/** Rich text from the CMS, rendered by Payload's Lexical serializer (no raw HTML, docs/14). */
export function RichText({ data, className = '' }: { data: unknown; className?: string }) {
  if (!data || typeof data !== 'object') return null
  return (
    <LexicalRichText
      className={`prose-store text-ink [&_a]:text-accent [&_a]:underline [&_h2]:mt-6 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:list-disc ${className}`}
      data={data as SerializedEditorState}
    />
  )
}
