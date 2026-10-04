// The shopper-facing origin of a store host. Production stores are https; *.localhost stores in
// development share the admin's port (README "Local setup").

export function storeOriginForHost(
  host: string | null | undefined,
  adminUrl: string = process.env.ADMIN_URL ?? 'http://localhost:3000',
): string | undefined {
  if (!host) return undefined
  const local = host === 'localhost' || host.endsWith('.localhost')
  if (!local) return `https://${host}`
  let port = ''
  try {
    port = new URL(adminUrl).port
  } catch {
    port = ''
  }
  return `http://${host}${port ? `:${port}` : ''}`
}
