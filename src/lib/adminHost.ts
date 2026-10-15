// The admin answers only on ADMIN_URL's host (docs/19 "The vendor CMS address"); in development
// also on localhost and 127.0.0.1, the hosts src/proxy.ts treats as the admin's. A store's own
// domain never serves the admin: staff sign in on the one admin address.

/** The hostnames (no port) the admin is served on. */
export function adminHostnames(
  adminUrl: string = process.env.ADMIN_URL ?? 'http://localhost:3000',
  production: boolean = process.env.NODE_ENV === 'production',
): Set<string> {
  let hostname = 'localhost'
  try {
    hostname = new URL(adminUrl).hostname
  } catch {
    // An unreadable ADMIN_URL falls back to the development default, as src/proxy.ts does
  }
  return new Set(production ? [hostname] : [hostname, 'localhost', '127.0.0.1'])
}

/** Whether a request's Host header (with or without a port) is the admin's. */
export function isAdminHost(
  host: string | null | undefined,
  hostnames: Set<string> = adminHostnames(),
): boolean {
  const hostname = (host ?? '').toLowerCase().replace(/:\d+$/, '')
  return hostnames.has(hostname)
}

/** The admin's sign-in address, for a request that reached the admin on a store's domain. */
export function adminAddress(
  adminUrl: string = process.env.ADMIN_URL ?? 'http://localhost:3000',
): string {
  try {
    return `${new URL(adminUrl).origin}/admin`
  } catch {
    return 'http://localhost:3000/admin'
  }
}
