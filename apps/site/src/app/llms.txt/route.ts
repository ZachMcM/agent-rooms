import { githubUrl, npmUrl } from '@/lib/layout.shared'
import { siteDescription, siteName, siteUrl } from '@/lib/site'

export const dynamic = 'force-static'

const content = `# ${siteName}

> ${siteDescription}

CoordRooms is a local coordination layer for parallel coding-agent sessions. It shares durable decisions, questions, warnings, answers, and handoffs through one user-global SQLite database. It requires no account, authentication, or hosted service.

## Documentation

- [Documentation](${siteUrl}/docs): Product documentation and concepts
- [Installation](${siteUrl}/docs/installation): Install CoordRooms and connect supported clients
- [Getting started](${siteUrl}/docs/getting-started): Create a room and coordinate agent sessions
- [MCP tools](${siteUrl}/docs/mcp-tools): Agent-facing coordination operations
- [CLI reference](${siteUrl}/docs/cli): Installer, dashboard, and MCP server commands
- [Files and data](${siteUrl}/docs/files-and-data): Local paths and SQLite storage

## Links

- [Website](${siteUrl})
- [GitHub](${githubUrl})
- [npm](${npmUrl})
`

export function GET() {
  return new Response(content, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
