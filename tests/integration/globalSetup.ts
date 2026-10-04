import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string
  }
}

/**
 * One MongoDB replica set for the integration run (transactions need a replica set): the one in
 * MONGODB_TEST_URI (for example docker compose), otherwise an in-memory one. Each test file then
 * works in its own database (setup.ts).
 */
export default async function setup(project: TestProject) {
  let uri = process.env.MONGODB_TEST_URI
  let stop: (() => Promise<unknown>) | undefined
  if (!uri) {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server-core')
    const server = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    })
    uri = server.getUri()
    stop = () => server.stop()
  }
  project.provide('mongoUri', uri)
  return async () => {
    await stop?.()
  }
}
