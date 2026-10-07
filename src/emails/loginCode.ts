// The shopper's sign-in code (docs/05 "Email OTP"): in the store's name, the code in large
// type, and a line for the shopper who didn't ask for it.

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

const safeColor = (value: string | null | undefined) =>
  value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : '#111827'

export function loginCodeEmail(input: {
  storeName: string
  code: string
  minutes: number
  themeColor?: string | null
}) {
  const subject = `${input.code} is your ${input.storeName} code`
  const text = [
    `Your code to log in to ${input.storeName}: ${input.code}`,
    '',
    `It works for ${input.minutes} minutes. If you didn’t ask for it, you can ignore this email: nobody can log in without the code.`,
    '',
    input.storeName,
  ].join('\n')
  const color = safeColor(input.themeColor)
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,sans-serif;color:#111827;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:15px;font-weight:bold;color:${color}">${escapeHtml(input.storeName)}</td></tr>
<tr><td style="padding-top:18px;font-size:15px">Your code to log in:</td></tr>
<tr><td style="padding-top:8px;font-size:32px;font-weight:bold;letter-spacing:6px;font-family:monospace">${escapeHtml(input.code)}</td></tr>
<tr><td style="padding-top:16px;font-size:13px;color:#4B5565">It works for ${input.minutes} minutes. If you didn’t ask for it, you can ignore this email: nobody can log in without the code.</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}
