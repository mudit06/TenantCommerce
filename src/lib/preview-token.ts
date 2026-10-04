// Signed links for draft previews (docs/screens Page builder rule 4). The editor's live preview
// loads the page from the store's own domain, where the admin's login cookie never goes, so the
// link itself carries a short-lived HMAC proof: which page, which store, until when. Web Crypto
// only, so the same code runs in the proxy and in Payload.

export type PreviewClaims = { pageId: string; tenantId: string; expiresAt: number }

/** Long enough for a working session in the editor; the editor makes a fresh link on reload. */
export const PREVIEW_TTL_MS = 8 * 60 * 60 * 1000

const encoder = new TextEncoder()

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const fromBase64Url = (text: string) => {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)))
}

/** Constant-time comparison, so a forged signature can't be guessed byte by byte. */
function sameBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export async function signPreviewToken(
  claims: Omit<PreviewClaims, 'expiresAt'>,
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const body = toBase64Url(
    encoder.encode(
      JSON.stringify({ p: claims.pageId, t: claims.tenantId, e: now + PREVIEW_TTL_MS }),
    ),
  )
  return `${body}.${toBase64Url(await hmac(secret, `preview:${body}`))}`
}

/** The token's claims when it is genuine and unexpired, otherwise null. */
export async function verifyPreviewToken(
  token: string | null | undefined,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<PreviewClaims | null> {
  if (!token || !secret) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  try {
    if (!sameBytes(fromBase64Url(signature), await hmac(secret, `preview:${body}`))) return null
    const raw = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as {
      p?: unknown
      t?: unknown
      e?: unknown
    }
    if (typeof raw.p !== 'string' || typeof raw.t !== 'string' || typeof raw.e !== 'number') {
      return null
    }
    if (raw.e <= now) return null
    return { pageId: raw.p, tenantId: raw.t, expiresAt: raw.e }
  } catch {
    return null
  }
}
