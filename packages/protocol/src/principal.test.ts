import { describe, expect, it } from 'vitest'

import { principalSchema } from './principal'

describe('principalSchema', () => {
  it('accepts a principal carrying a user id', () => {
    expect(principalSchema.parse({ userId: 'usr_123' })).toEqual({ userId: 'usr_123' })
  })

  it('rejects an empty user id', () => {
    expect(principalSchema.safeParse({ userId: '' }).success).toBe(false)
  })

  it('rejects a missing user id', () => {
    expect(principalSchema.safeParse({}).success).toBe(false)
  })
})
