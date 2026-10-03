// Browser helper for our custom endpoints (docs/07 envelope). Cookies carry the session.

export type ApiError = { code: string; message: string; fields?: Record<string, string> }
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export async function callApi<T = unknown>(
  path: string,
  init: { method?: 'POST' | 'PATCH' | 'GET'; body?: unknown } = {},
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
        message: 'Something went wrong. Try again.',
      },
    }
  } catch {
    return {
      ok: false,
      error: { code: 'NETWORK', message: 'Could not reach the server. Check your connection.' },
    }
  }
}
