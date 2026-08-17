import { compare, SemVer } from 'semver'
import { z } from 'zod'

export type InstallState = {
  version: 1
  package: {
    name: string
    version: string
  }
  installedAt: string
  current: string
  previous?: string
}

export function isStrictVersion(value: string): boolean {
  try {
    const version = new SemVer(value)
    return (
      `${version.version}${version.build.length > 0 ? `+${version.build.join('.')}` : ''}` === value
    )
  } catch {
    return false
  }
}

export function compareVersions(left: string, right: string): number {
  if (!isStrictVersion(left) || !isStrictVersion(right)) {
    throw new Error('Invalid runtime version.')
  }
  return compare(left, right)
}

export function parseInstallState(value: unknown): InstallState {
  const result = installStateSchema.safeParse(value)
  if (!result.success) throw installStateError(result.error)
  return result.data
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value
}

function installStateError(error: z.ZodError): Error {
  if (error.issues.some((issue) => issue.path.length === 0 || issue.path[0] === 'version')) {
    return new Error('Install state has an unsupported format.')
  }
  return new Error('Install state contains invalid values.')
}

const strictVersionSchema = z.string().refine(isStrictVersion)
const isoDateSchema = z.string().refine(isIsoDate)

const installStateSchema = z
  .object({
    version: z.literal(1),
    package: z.object({
      name: z.string(),
      version: strictVersionSchema,
    }),
    installedAt: isoDateSchema,
    current: strictVersionSchema,
    previous: strictVersionSchema.optional(),
  })
  .passthrough()
