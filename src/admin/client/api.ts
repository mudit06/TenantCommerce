// Browser helper for our custom endpoints (docs/07 envelope). Cookies carry the session.

export type ApiError = { code: string; message: string; fields?: Record<string, string> }
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export async function callApi<T = unknown>(
  path: string,
  init: { method?: 'POST' | 'PATCH' | 'GET' | 'DELETE'; body?: unknown } = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`/api${path}`, {
      method: init.method ?? 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    const json = (await response.json().catch(() => null)) as
      { data: T; error: null } | { data: null; error: ApiError } | null
    if (response.ok && json && !json.error) return { ok: true, data: json.data }
    return {
      ok: false,
      error: json?.error ?? {
        code: 'HTTP_' + response.status,
        message:
          response.status === 401
            ? 'Your session has ended. Sign in again and retry.'
            : response.status === 403
              ? 'You don’t have permission to do this in this store.'
              : `The server couldn’t finish this (error ${response.status}). Try again in a moment; if it keeps happening, tell the platform team.`,
      },
    }
  } catch {
    return {
      ok: false,
      error: { code: 'NETWORK', message: 'Could not reach the server. Check your connection.' },
    }
  }
}
