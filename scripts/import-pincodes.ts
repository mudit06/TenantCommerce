/**
 * pnpm import:pincodes <directory.csv>
 * Loads India's pincode directory (docs/06 `pincodes`) from the All India Pincode Directory CSV
 * on data.gov.in (Open Government Data licence; download it yourself, the file isn't kept in git).
 * One row per pincode with its district as the city, the GST state and, when the file has it, the
 * post office's position. Safe to run again: each pincode is replaced, so a quarterly refresh is
 * the same command with the new file.
 */
import { readFile } from 'node:fs/promises'

import config from '@payload-config'
import { getPayload } from 'payload'

import { parseCsv } from '@/lib/csv'
import { readPincodeDirectory } from '@/modules/shipping'

const BATCH = 1000

const file = process.argv.slice(2).find((arg) => arg.toLowerCase().endsWith('.csv'))
if (!file) {
  console.error('Usage: pnpm import:pincodes path/to/pincode-directory.csv')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  const directory = readPincodeDirectory(parseCsv(await readFile(file, 'utf8')))
  console.log(
    `Read ${directory.offices} post offices: ${directory.rows.length} pincodes, ` +
      `${directory.skipped.badPincode} without a valid pincode, ` +
      `${directory.skipped.unknownState} with a state we don't know`,
  )
  for (const [name, count] of Object.entries(directory.unknownStates))
    console.log(`  Unknown state "${name}": ${count} rows`)

  // Straight to MongoDB in batches: 19,000 pincodes through the Local API one by one would take
  // minutes. Platform data with no store, no hooks and only super admins can read it.
  const Pincodes = payload.db.collections.pincodes!
  let written = 0
  for (let i = 0; i < directory.rows.length; i += BATCH) {
    const batch = directory.rows.slice(i, i + BATCH)
    await Pincodes.bulkWrite(
      batch.map((row) => ({
        updateOne: { filter: { pincode: row.pincode }, update: { $set: row }, upsert: true },
      })),
      { ordered: false },
    )
    written += batch.length
    console.log(`  ${written} of ${directory.rows.length}`)
  }
  console.log(`Done: ${written} pincodes in the directory`)
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
