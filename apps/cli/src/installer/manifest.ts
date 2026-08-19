import { join } from 'node:path'

import { z } from 'zod'

import { configPath, mcpConfigPath, skillPath } from './clients'
import { readOptionalOwnedFile } from './filesystem'
import { assertPathWithin, assertSafeAbsolutePath, type ClientRoot } from './preflight'
import { parseInstallState, type InstallState } from './state'

const sha256Schema = z.string().regex(/^[a-f\d]{64}$/)
const clientSchema = z.enum(['claude', 'codex', 'cursor'])

const manifestRootSchema = z.object({
  client: clientSchema,
  path: z.string(),
  config: z.string(),
})

const managedHookSchema = z.object({
  path: z.string(),
  event: z.string(),
  entries: z.array(z.unknown()).min(1),
})

const managedFileSchema = z.object({
  path: z.string(),
  hash: sha256Schema,
})

const managedMcpSchema = z.object({
  path: z.string(),
  client: clientSchema,
  command: z.string(),
  args: z.array(z.string()),
})

const manifestSchema = z
  .object({
    version: z.literal(1),
    package: z.object({
      name: z.string(),
      version: z.string(),
    }),
    installedAt: z.string(),
    current: z.string(),
    previous: z.string().optional(),
    roots: z.array(manifestRootSchema),
    hooks: z.array(managedHookSchema),
    skills: z.array(managedFileSchema),
    profiles: z.array(managedFileSchema),
    mcps: z.array(managedMcpSchema).optional(),
    backups: z.array(z.string()).optional(),
  })
  .passthrough()

export type ManagedFile = z.infer<typeof managedFileSchema>
export type ManagedHook = z.infer<typeof managedHookSchema>
export type ManagedMcp = z.infer<typeof managedMcpSchema>
export type ManifestRoot = z.infer<typeof manifestRootSchema>
export type Manifest = InstallState & {
  roots: ManifestRoot[]
  hooks: ManagedHook[]
  skills: ManagedFile[]
  profiles: ManagedFile[]
  mcps: ManagedMcp[]
  backups?: string[]
}

export type NewManifest = Omit<Manifest, 'previous' | 'backups'>

export async function readManifest(path: string, context: ManifestContext): Promise<Manifest> {
  const source = await readOptionalOwnedFile(path, context.home)
  if (source === undefined) throw new Error('Agent Rooms is not installed.')
  return parseManifestSource(source, context)
}

export async function readPriorManifest(context: ManifestContext): Promise<Manifest | undefined> {
  const path = join(context.root, 'install-state.json')
  const source = await readOptionalOwnedFile(path, context.home)
  if (source === undefined) return undefined
  try {
    return parseManifestSource(source, context)
  } catch (error) {
    if (error instanceof Error && error.message === 'Install manifest has an unsupported format.')
      return undefined
    throw error
  }
}

export async function currentVersion(
  root: string,
  trustedBase: string,
): Promise<string | undefined> {
  const manifest = await readOptionalOwnedFile(join(root, 'install-state.json'), trustedBase)
  if (manifest === undefined) return undefined
  return parseInstallState(JSON.parse(manifest)).current
}

function parseManifestSource(source: string, context: ManifestContext): Manifest {
  const parsed = parseManifestJson(source)
  const state = parseInstallState(parsed)
  const manifest = {
    ...state,
    roots: parsed.roots,
    hooks: parsed.hooks,
    skills: parsed.skills,
    profiles: parsed.profiles,
    mcps: parsed.mcps ?? [],
    ...(parsed.backups === undefined ? {} : { backups: parsed.backups }),
  }
  if (state.package.name !== 'agent-rooms') {
    throw new Error('Install manifest has an unsupported format.')
  }
  validateManifestPaths(manifest, context)
  return manifest
}

function parseManifestJson(source: string): z.infer<typeof manifestSchema> {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch (error) {
    throw new Error('Install manifest has an unsupported format.', { cause: error })
  }
  const result = manifestSchema.safeParse(value)
  if (!result.success) throw new Error('Install manifest has an unsupported format.')
  return result.data
}

function validateManifestPaths(manifest: Manifest, context: ManifestContext): void {
  const configs = new Set<string>()
  const skills = new Set<string>()
  for (const root of manifest.roots) {
    assertSafeAbsolutePath(root.path, `${root.client} manifest root`)
    assertPathWithin(root.path, context.home, `${root.client} manifest root`)
    const expectedConfig = configPath(root)
    if (root.config !== expectedConfig)
      throw new Error('Install manifest contains an invalid config path.')
    configs.add(expectedConfig)
    skills.add(skillPath(root, context.home))
  }

  if (manifest.hooks.some((hook) => !configs.has(hook.path))) {
    throw new Error('Install manifest contains invalid hook ownership.')
  }
  for (const mcp of manifest.mcps) {
    if (
      mcp.path !==
      mcpConfigPath({ client: mcp.client, path: rootForClient(manifest, mcp.client) }, context.home)
    )
      throw new Error('Install manifest contains invalid MCP ownership.')
  }
  if (manifest.skills.some((file) => !skills.has(file.path))) {
    throw new Error('Install manifest contains invalid skill ownership.')
  }

  const profilePaths = new Set([
    join(context.home, '.zshrc'),
    join(context.home, '.bash_profile'),
    join(context.home, '.bashrc'),
    join(context.home, '.config', 'fish', 'config.fish'),
  ])
  if (manifest.profiles.some((file) => !profilePaths.has(file.path))) {
    throw new Error('Install manifest contains invalid profile ownership.')
  }

  const backups = join(context.root, 'backups')
  for (const path of manifest.backups ?? []) {
    assertPathWithin(path, backups, 'Manifest backup')
  }
}

function rootForClient(manifest: Manifest, client: ManifestRoot['client']): string {
  const root = manifest.roots.find((entry) => entry.client === client)
  if (!root) throw new Error('Install manifest contains invalid MCP ownership.')
  return root.path
}

type ManifestContext = {
  home: string
  root: string
  roots?: ClientRoot[]
}
