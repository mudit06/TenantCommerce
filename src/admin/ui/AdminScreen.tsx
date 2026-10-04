import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import type { ReactNode } from 'react'

/**
 * A custom admin view inside the admin shell (menu, header, session banner). Payload renders
 * root views bare unless they use its default template.
 */
export function AdminScreen({
  view,
  children,
}: {
  view: AdminViewServerProps
  children: ReactNode
}) {
  const { initPageResult, params, searchParams } = view
  const { req, permissions, visibleEntities, locale } = initPageResult
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      {children}
    </DefaultTemplate>
  )
}
