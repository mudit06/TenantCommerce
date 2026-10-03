import config from '@payload-config'
import { getPayload } from 'payload'

/** The Payload Local API for server code (the instance is created once per process). */
export const getPayloadClient = () => getPayload({ config })
