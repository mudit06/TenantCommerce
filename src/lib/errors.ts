import { APIError } from 'payload'

// One error type for business and validation failures. It extends Payload's APIError so a rule
// broken inside a hook reaches the admin UI as a readable message, and our endpoints map it to
// the API envelope (docs/07). Never leak stack traces (docs/16).
export type AppErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE'
  | 'FEATURE_DISABLED'
  | 'FEATURE_NOT_IN_PLAN'
  | 'FEATURE_NOT_AVAILABLE'
  | 'FEATURE_DEPENDENCY'
  | 'PLAN_LIMIT_REACHED'
  | 'INVALID_TRANSITION'

export class AppError extends APIError {
  readonly code: AppErrorCode
  readonly httpStatus: number
  readonly fields?: Record<string, string>

  constructor(
    code: AppErrorCode,
    message: string,
    httpStatus = 422,
    fields?: Record<string, string>,
  ) {
    super(message, httpStatus, { code, fields }, true)
    this.name = 'AppError'
    this.code = code
    this.httpStatus = httpStatus
    this.fields = fields
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError
