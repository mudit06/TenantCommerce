// A store's own message that isn't an order update (docs/18): review requests, offers and cart
// reminders. In the store's name, one button, and for offers an unsubscribe link that works in
// one tap. Plain HTML that renders in every mail app.

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

const safeColor = (value: string | null | undefined) =>
  value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#111827'

export type StoreMessageInput = {
  storeName: string
  subject: string
  heading: string
  paragraphs: string[]
  button?: { label: string; url: string } | null
  footer?: string | null
  unsubscribeUrl?: string | null
  themeColor?: string | null
}

export function storeMessageEmail(input: StoreMessageInput) {
  const color = safeColor(input.themeColor)
  const text = [
    input.heading,
    '',
    ...input.paragraphs,
    ...(input.button ? ['', `${input.button.label}: ${input.button.url}`] : []),
    ...(input.footer ? ['', input.footer] : []),
    ...(input.unsubscribeUrl ? ['', `Unsubscribe: ${input.unsubscribeUrl}`] : []),
    '',
    input.storeName,
  ].join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#111827;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:15px;font-weight:bold;color:${color}">${escapeHtml(input.storeName)}</td></tr>
<tr><td style="padding-top:18px;font-size:22px;font-weight:bold">${escapeHtml(input.heading)}</td></tr>
${input.paragraphs.map((p) => `<tr><td style="padding-top:12px;font-size:15px">${escapeHtml(p)}</td></tr>`).join('\n')}
${input.button ? `<tr><td style="padding-top:22px"><a href="${escapeHtml(input.button.url)}" style="display:inline-block;background:${color};color:#ffffff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(input.button.label)}</a></td></tr>` : ''}
${input.footer ? `<tr><td style="padding-top:22px;font-size:13px;color:#4B5565">${escapeHtml(input.footer)}</td></tr>` : ''}
${input.unsubscribeUrl ? `<tr><td style="padding-top:18px;font-size:12px;color:#6B7280"><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6B7280">Unsubscribe</a> from offers from ${escapeHtml(input.storeName)}. Order updates are not affected.</td></tr>` : ''}
</table></td></tr></table></body></html>`
  return {
    subject: input.subject,
    text,
    html,
    headers: input.unsubscribeUrl
      ? {
          'List-Unsubscribe': `<${input.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : undefined,
  }
}
