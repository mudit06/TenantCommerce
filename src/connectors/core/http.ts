// Outbound calls to providers (docs/09 `core/http.ts`): a 10 second timeout, two retries with
// jitter on network errors and 5xx for calls that are safe to repeat, and logs that never carry
// bodies, headers or query strings (they hold keys and shopper details).

export type ProviderResponse<T = unknown> = {
  ok: boolean
  status: number
  /** Parsed JSON, or null when the body wasn't JSON */
  json: T | null
}

export class ProviderUnreachable extends Error {
  constructor(provider: string, cause?: unknown) {
    super(`${provider} could not be reached`)
    this.name = 'ProviderUnreachable'
    this.cause = cause
  }
}

type Options = {
  provider: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  /** Sent as JSON */
  body?: unknown
  /** Repeat on network errors and 5xx. Defaults to true for GET only. */
  retry?: boolean
  timeoutMs?: number
  /** Tests replace the network */
  fetchImpl?: typeof fetch
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function providerFetch<T = unknown>(
  url: string,
  {
    provider,
    method = 'GET',
    headers = {},
    body,
    retry = method === 'GET',
    timeoutMs = 10_000,
    fetchImpl = fetch,
  }: Options,
): Promise<ProviderResponse<T>> {
  const attempts = retry ? 3 : 1
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.status >= 500 && attempt < attempts) {
        lastError = new Error(`HTTP ${response.status}`)
      } else {
        const text = await response.text()
        let json: T | null = null
        try {
          json = text ? (JSON.parse(text) as T) : null
        } catch {
          json = null
        }
        return { ok: response.ok, status: response.status, json }
      }
    } catch (error) {
      lastError = error
    }
    if (attempt < attempts) await sleep(200 * 2 ** attempt + Math.random() * 200)
  }
  throw new ProviderUnreachable(provider, lastError)
}

/** `Basic <base64(user:password)>` */
export const basicAuth = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
