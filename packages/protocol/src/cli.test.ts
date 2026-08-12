import { describe, expect, it } from 'vitest'

import { joinRoomInputSchema, readDecisionsInputSchema, writeDecisionInputSchema } from './cli'

describe('cli command contracts', () => {
  it('requires a session id on join_room', () => {
    expect(
      joinRoomInputSchema.safeParse({ roomName: 'feature', agentLabel: 'backend' }).success,
    ).toBe(false)
  })

  it('requires a session id on write_decision', () => {
    expect(writeDecisionInputSchema.safeParse({ body: 'snake_case at the boundary' }).success).toBe(
      false,
    )
  })

  it('treats the read_decisions query as optional', () => {
    expect(readDecisionsInputSchema.safeParse({ sessionId: 'sess_1' }).success).toBe(true)
  })
})
