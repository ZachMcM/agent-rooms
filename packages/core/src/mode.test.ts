import { describe, expect, it } from 'vitest'

import { MODE_ENV_VAR, resolveMode } from './mode'

describe('resolveMode', () => {
  it('defaults to local when the env var is absent', () => {
    expect(resolveMode({})).toBe('local')
  })

  it('reads an explicit cloud mode', () => {
    expect(resolveMode({ [MODE_ENV_VAR]: 'cloud' })).toBe('cloud')
  })

  it('falls back to local for an unrecognised value', () => {
    expect(resolveMode({ [MODE_ENV_VAR]: 'staging' })).toBe('local')
  })
})
