// Shopper order update emails (docs/18): in the store's name, with a "Track order" button to the
// tracking page on the store's own domain. Plain HTML that renders in every mail app.

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

export type OrderUpdateEmailInput = {
  storeName: string
  subject: string
  heading: string
  paragraphs: string[]
  trackUrl: string
  orderNumber: string
  themeColor?: string | null
  supportLine?: string | null
}

const safeColor = (value: string | null | undefined) =>
  value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#111827'

export function orderUpdateEmail(input: OrderUpdateEmailInput) {
  const color = safeColor(input.themeColor)
  const text = [
    input.heading,
    '',
    ...input.paragraphs,
    '',
    `Track order ${input.orderNumber}: ${input.trackUrl}`,
    ...(input.supportLine ? ['', input.supportLine] : []),
    '',
    input.storeName,
  ].join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#111827;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:15px;font-weight:bold;color:${color}">${escapeHtml(input.storeName)}</td></tr>
<tr><td style="padding-top:18px;font-size:22px;font-weight:bold">${escapeHtml(input.heading)}</td></tr>
${input.paragraphs.map((p) => `<tr><td style="padding-top:12px;font-size:15px">${escapeHtml(p)}</td></tr>`).join('\n')}
<tr><td style="padding-top:22px"><a href="${escapeHtml(input.trackUrl)}" style="display:inline-block;background:${color};color:#ffffff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Track order</a></td></tr>
${input.supportLine ? `<tr><td style="padding-top:22px;font-size:13px;color:#4B5565">${escapeHtml(input.supportLine)}</td></tr>` : ''}
</table>
<p style="font-size:12px;color:#6B7280;margin-top:14px">You are getting this because you placed order ${escapeHtml(input.orderNumber)} with ${escapeHtml(input.storeName)}.</p>
</td></tr></table>
</body></html>`
  return { subject: input.subject, text, html }
}

/** Staff alerts (new order, delivery failed, a shopper replied): plain and short */
export function staffAlertEmail(input: { subject: string; lines: string[]; link: string }) {
  const text = [...input.lines, '', input.link].join('\n')
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
${input.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('\n')}
<p><a href="${escapeHtml(input.link)}">Open the order</a></p>
</body></html>`
  return { subject: input.subject, text, html }
}
