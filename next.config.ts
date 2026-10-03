import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker image small (docs/15)
  output: 'standalone',
  poweredByHeader: false,
  // CLAUDE.md is the project's own AI instructions; `next dev` must not append to it
  agentRules: false,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
