import type { TaskConfig } from 'payload'

import { runImport } from '../services/jobs'

/** A confirmed import, in the background so a large file doesn't time out (rule 2). */
export const runImportTask: TaskConfig<'run-import'> = {
  slug: 'run-import',
  label: 'Import a checked CSV file',
  retries: 0,
  inputSchema: [{ name: 'importId', type: 'text', required: true }],
  outputSchema: [
    { name: 'created', type: 'number', required: true },
    { name: 'updated', type: 'number', required: true },
    { name: 'skipped', type: 'number', required: true },
  ],
  handler: async ({ input, req }) => ({ output: await runImport(req.payload, input.importId) }),
}
