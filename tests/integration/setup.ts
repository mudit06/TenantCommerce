import { randomBytes } from 'node:crypto'

import { inject } from 'vitest'

// Runs before each integration file is imported: point Payload at a fresh database.
const url = new URL(inject('mongoUri'))
url.pathname = `/te_test_${randomBytes(4).toString('hex')}`
process.env.DATABASE_URI = url.toString()
process.env.PAYLOAD_SECRET ||= randomBytes(32).toString('hex')
process.env.ADMIN_URL ||= 'http://localhost:3000'
process.env.PLATFORM_DOMAIN ||= 'test.local'
