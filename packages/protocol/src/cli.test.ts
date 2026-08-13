import { describe, expect, it } from 'vitest'

import { joinRoomInputSchema, readMessagesInputSchema, writeMessageInputSchema } from './cli'

describe('cli command contracts', () => {
  it('requires a conversation id on join_room', () => {
    expect(joinRoomInputSchema.safeParse({ roomName: 'feature' }).success).toBe(false)
  })

  it('requires a conversation id on write_message', () => {
    expect(
      writeMessageInputSchema.safeParse({ kind: 'decision', body: 'snake_case at the boundary' })
        .success,
    ).toBe(false)
  })

  it('rejects a kind outside the enum', () => {
    expect(
      writeMessageInputSchema.safeParse({
        conversationId: 'conv_1',
        kind: 'note',
        body: 'anything',
      }).success,
    ).toBe(false)
  })

  it('treats the read_messages query and kind as optional', () => {
    expect(readMessagesInputSchema.safeParse({ conversationId: 'conv_1' }).success).toBe(true)
  })
})
