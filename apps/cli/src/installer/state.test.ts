import { describe, expect, it } from 'vitest'

import { compareVersions, isStrictVersion, parseInstallState } from './state'

describe('install state', () => {
  it.each(['0.0.0', '22.12.0', '1.2.3-rc.1+build.4'])('accepts strict semver %s', (version) => {
    expect(isStrictVersion(version)).toBe(true)
  })

  it.each(['1', '1.2', 'v1.2.3', '01.2.3', '^1.2.3', '1.2.3.4', '1.2.3-01'])(
    'rejects non-strict semver %s',
    (version) => {
      expect(isStrictVersion(version)).toBe(false)
    },
  )

  it('validates stored state', () => {
    expect(
      parseInstallState({
        version: 1,
        package: { name: 'coordrooms', version: '1.2.3' },
        installedAt: '2026-08-16T00:00:00.000Z',
        current: '1.2.3',
        previous: '1.2.2',
      }),
    ).toMatchObject({ current: '1.2.3' })
  })

  it('rejects unsafe runtime names', () => {
    expect(() =>
      parseInstallState({
        version: 1,
        package: { name: 'coordrooms', version: '1.2.3' },
        installedAt: '2026-08-16T00:00:00.000Z',
        current: '../outside',
      }),
    ).toThrow('invalid values')
  })

  it('compares prerelease versions by semver precedence', () => {
    expect(compareVersions('1.0.0-rc.2', '1.0.0-rc.10')).toBeLessThan(0)
    expect(compareVersions('1.0.0', '1.0.0-rc.10')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBeLessThan(0)
    expect(compareVersions('1.0.0+build.2', '1.0.0+build.1')).toBe(0)
  })

  it('implements the complete semver prerelease precedence sequence', () => {
    const versions = [
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-alpha.beta',
      '1.0.0-beta',
      '1.0.0-beta.2',
      '1.0.0-beta.11',
      '1.0.0-rc.1',
      '1.0.0',
    ]

    for (let index = 1; index < versions.length; index += 1) {
      expect(compareVersions(versions[index - 1]!, versions[index]!)).toBeLessThan(0)
    }
  })

  it('rejects numeric core identifiers outside the supported semver range', () => {
    expect(isStrictVersion('9007199254740992.0.0')).toBe(false)
    expect(() => compareVersions('9007199254740992.0.0', '9007199254740993.0.0')).toThrow(
      'Invalid runtime version',
    )
  })
})
