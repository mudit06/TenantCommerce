import type { DocumentViewServerProps } from 'payload'

import { isPlatformStaff } from '@/access'
import { Card, Empty, Notice, Pill } from '@/admin/ui'
import { formatDate } from '@/lib/dates'

/** Vendor detail, Domains tab. Custom domains with automatic SSL are Phase 2. */
export async function DomainsView({ initPageResult }: DocumentViewServerProps) {
  const { req } = initPageResult
  const tenantId = initPageResult.docID ? String(initPageResult.docID) : null
  if (!isPlatformStaff(req.user) || !tenantId) return <Notice tone="danger">Our team only.</Notice>
  const { docs } = await req.payload.find({
    collection: 'tenant-domains',
    where: { tenant: { equals: tenantId } },
    sort: '-isPrimary',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return (
    <div className="te-page te-page--tab">
      <Card title="Domains">
        {docs.length === 0 ? (
          <Empty>No domain yet.</Empty>
        ) : (
          <table className="te-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Type</th>
                <th>Primary</th>
                <th>SSL</th>
                <th>Verified</th>
                <th>Other hosts redirect</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((domain) => (
                <tr key={domain.id}>
                  <td className="te-mono">{domain.host}</td>
                  <td>{domain.type === 'subdomain' ? 'Subdomain' : 'Custom'}</td>
                  <td>{domain.isPrimary ? <Pill tone="info">Primary</Pill> : '—'}</td>
                  <td>
                    <Pill
                      tone={
                        domain.sslStatus === 'active'
                          ? 'success'
                          : domain.sslStatus === 'failed'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {domain.type === 'subdomain' && domain.sslStatus === 'active'
                        ? 'Managed by us'
                        : (domain.sslStatus ?? 'pending')}
                    </Pill>
                  </td>
                  <td>{domain.verifiedAt ? formatDate(domain.verifiedAt) : '—'}</td>
                  <td>{domain.redirectToPrimary ? 'Yes (301)' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title="Add a custom domain">
        <p className="te-muted">
          <Pill>Phase 2</Pill> The vendor adds a CNAME record, we verify it through the Vercel
          Domains API and the certificate is issued automatically. In the MVP every store uses its
          subdomain.
        </p>
      </Card>
    </div>
  )
}
