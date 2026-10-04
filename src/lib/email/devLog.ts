import type { EmailAdapter } from 'payload'

/**
 * Local and staging email: prints the whole message (including invite links) to the server log
 * and sends nothing, like the dev-log messaging connector (docs/02, docs/09). Production uses
 * Resend when RESEND_API_KEY is set.
 */
export const devLogEmailAdapter =
  ({ fromAddress, fromName }: { fromAddress: string; fromName: string }): EmailAdapter =>
  ({ payload }) => ({
    name: 'dev-log',
    defaultFromAddress: fromAddress,
    defaultFromName: fromName,
    sendEmail: async (message) => {
      const to = Array.isArray(message.to) ? message.to.join(', ') : String(message.to ?? '')
      const body = typeof message.text === 'string' ? message.text : '(html only)'
      payload.logger.info(
        `[dev-log email] To: ${to}\nSubject: ${String(message.subject ?? '')}\n\n${body}\n`,
      )
      return { id: `dev-log-${Date.now()}` }
    },
  })
