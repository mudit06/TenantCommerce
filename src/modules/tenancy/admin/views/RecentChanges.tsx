import type { UIFieldServerComponent } from 'payload'

import { isPlatformStaff } from '@/access'
import { Card, Empty } from '@/admin/ui'
import { formatDate } from '@/lib/dates'

/** Latest audit entries for this store (docs/screens Vendor overview "Recent changes"). */
export const RecentChanges: UIFieldServerComponent = async ({ id, req }) => {
  if (!id || !isPlatformStaff(req.user)) return null
  const { docs } = await req.payload.find({
    collection: 'audit-logs',
    where: { tenant: { equals: id } },
    sort: '-at',
    limit: 8,
    depth: 1,
    overrideAccess: true,
  })
  return (
    <Card className="te-card--sidebar" title="Recent changes">
      {docs.length === 0 ? (
        <Empty>No changes yet.</Empty>
      ) : (
        <ul className="te-timeline">
          {docs.map((entry) => {
            const actor =
              typeof entry.actor === 'object' && entry.actor ? entry.actor.name : 'System'
            return (
              <li key={entry.id}>
                <span className="te-timeline__date">{formatDate(entry.at)}</span>
                <span>
                  <strong>{actor}</strong>
                  {entry.actingAsPlatform ? ' (platform)' : ''}:{' '}
                  {entry.summary ?? entry.action.replace(/_/g, ' ')}
                  {entry.reason ? <span className="te-muted"> · {entry.reason}</span> : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
