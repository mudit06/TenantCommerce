import {
  addDataAndFileToRequest,
  APIError,
  ValidationError,
  type PayloadHandler,
  type PayloadRequest,
} from 'payload'
import { ZodError, type ZodType } from 'zod'

import { env } from '@/lib/env'
import { AppError, isAppError } from '@/lib/errors'

// Response envelope for our custom endpoints (docs/07): { data, error: null } or
// { data: null, error: { code, message, fields? } } with a meaningful HTTP status.

export const ok = (data: unknown, status = 200) => Response.json({ data, error: null }, { status })

export const fail = (
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string>,
) => Response.json({ data: null, error: { code, message, fields } }, { status })

function fieldsFromZod(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_'
    fields[path] ??= issue.message
  }
  return fields
}

/** Wraps a handler so AppError and zod failures become envelopes and nothing leaks a stack. */
export function apiHandler(handler: (req: PayloadRequest) => Promise<Response>): PayloadHandler {
  return async (req) => {
    try {
      return await handler(req)
    } catch (error) {
      if (isAppError(error)) {
        return fail(error.code, error.message, error.httpStatus, error.fields)
      }
      if (error instanceof ZodError) {
        return fail('VALIDATION_FAILED', 'Check the highlighted fields', 400, fieldsFromZod(error))
      }
      if (error instanceof ValidationError) {
        const fields: Record<string, string> = {}
        for (const item of error.data.errors) fields[item.path] ??= item.message
        return fail('VALIDATION_FAILED', error.message, 400, fields)
      }
      if (error instanceof APIError && error.isPublic) {
        return fail('BUSINESS_RULE', error.message, error.status)
      }
      req.payload.logger.error({ err: error, msg: 'Unhandled error in custom endpoint' })
      return fail('INTERNAL', 'Something went wrong. Try again in a moment.', 500)
    }
  }
}

export async function readBody<T>(req: PayloadRequest, schema: ZodType<T>): Promise<T> {
  await addDataAndFileToRequest(req)
  return schema.parse(req.data ?? {})
}

export function routeParam(req: PayloadRequest, name: string): string {
  const value = req.routeParams?.[name]
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError('NOT_FOUND', 'Not found', 404)
  }
  return value
}

/**
 * Custom POST endpoints check Origin (docs/05). Cookie-authenticated browser calls always send
 * it; server-to-server calls use an API key in the Authorization header instead.
 */
export function assertSameOrigin(req: PayloadRequest): void {
  const origin = req.headers.get('origin')
  if (!origin) {
    if (req.headers.get('authorization')) return
    throw new AppError('FORBIDDEN', 'Missing Origin header', 403)
  }
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw new AppError('FORBIDDEN', 'Bad Origin header', 403)
  }
  // The request's own host, or the configured admin host when a proxy rewrites Host
  const allowed = new Set([req.headers.get('host'), new URL(env.ADMIN_URL).host].filter(Boolean))
  if (!allowed.has(originHost)) {
    throw new AppError('FORBIDDEN', 'Cross-site request refused', 403)
  }
}
