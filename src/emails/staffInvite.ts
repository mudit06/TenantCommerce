// Plain staff emails sent by the platform (not shopper messages, which go through the
// notifications module). React Email templates replace these when that module lands (docs/18).

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

type InviteEmailInput = {
  name: string
  invitedByName?: string
  /** Store name for vendor staff; empty for our own team. */
  storeName?: string
  roleLabel: string
  link: string
  validHours: number
}

export function staffInviteEmail(input: InviteEmailInput) {
  const where = input.storeName
    ? `${input.storeName} on TenantEcom`
    : 'the TenantEcom platform team'
  const subject = input.storeName
    ? `You're invited to manage ${input.storeName}`
    : 'You are invited to the TenantEcom platform team'
  const by = input.invitedByName ? `${input.invitedByName} invited you` : 'You have been invited'
  const text = [
    `Hello ${input.name},`,
    '',
    `${by} to ${where} as ${input.roleLabel}.`,
    `Set your password to sign in: ${input.link}`,
    '',
    `The link works for ${input.validHours} hours and only once. If you weren't expecting this, ignore this email.`,
  ].join('\n')
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
<p>Hello ${escapeHtml(input.name)},</p>
<p>${escapeHtml(by)} to ${escapeHtml(where)} as <strong>${escapeHtml(input.roleLabel)}</strong>.</p>
<p><a href="${escapeHtml(input.link)}" style="display:inline-block;background:#2B4ACB;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Set your password</a></p>
<p style="color:#4B5565;font-size:13px">The link works for ${input.validHours} hours and only once. If you weren't expecting this, ignore this email.</p>
</body></html>`
  return { subject, text, html }
}

export function addedToStoreEmail(input: {
  name: string
  storeName: string
  roleLabel: string
  link: string
}) {
  const subject = `You now have access to ${input.storeName}`
  const text = `Hello ${input.name},\n\nYou were added to ${input.storeName} as ${input.roleLabel}. Sign in with your existing account: ${input.link}`
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
<p>Hello ${escapeHtml(input.name)},</p>
<p>You were added to <strong>${escapeHtml(input.storeName)}</strong> as ${escapeHtml(input.roleLabel)}.</p>
<p><a href="${escapeHtml(input.link)}">Sign in with your existing account</a></p>
</body></html>`
  return { subject, text, html }
}
