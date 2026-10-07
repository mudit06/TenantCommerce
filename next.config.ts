import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone output keeps the Docker image small (docs/15)
  output: 'standalone',
  poweredByHeader: false,
  // CLAUDE.md is the project's own AI instructions; `next dev` must not append to it
  agentRules: false,
  experimental: {
    // Review photos (up to 4, downsized in the browser first) come through a server action
    serverActions: { bodySizeLimit: '8mb' },
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
