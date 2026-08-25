import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { createDatabase } from '../client'
import { runMigrations } from '../migrator'
import { memberships, messages } from '../schema'
import {
  ActiveMembershipNotFoundError,
  consumeNewMessages,
  InvalidMessagesError,
  listRoomMessages,
  writeMessages,
  type WriteMessagesInput,
} from './messages'
import { createRoom } from './rooms'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), 'agent-rooms-db-'))
  directories.push(directory)
  const url = `file:${join(directory, 'db.sqlite')}`
  const db = await createDatabase(url)
  await runMigrations(db)
  return { db, url }
}

async function addMessage(
  db: Awaited<ReturnType<typeof createDatabase>>,
  roomId: string,
  membershipId: string,
) {
  const [message] = await db
    .insert(messages)
    .values({ roomId, membershipId, kind: 'status', body: 'message' })
    .returning()

  if (!message) {
    throw new Error('Message creation did not return an inserted record')
  }

  return message
}

describe('message operations', () => {
  it('returns undefined without an active membership', async () => {
    const { db } = await createTestDatabase()

    await expect(consumeNewMessages(db, { conversationId: 'missing' })).resolves.toBeUndefined()
  })

  it('lists undefined without an active membership', async () => {
    const { db } = await createTestDatabase()

    await expect(listRoomMessages(db, { conversationId: 'missing' })).resolves.toBeUndefined()
  })

  it('lists active-room messages in ascending order without advancing the cursor', async () => {
    const { db } = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'active', conversationId: 'conversation' })
    const other = await createRoom(db, { roomName: 'other', conversationId: 'other-conversation' })
    const first = await addMessage(db, active.room.id, active.membership.id)
    await addMessage(db, other.room.id, other.membership.id)
    const last = await addMessage(db, active.room.id, active.membership.id)
    await db
      .update(memberships)
      .set({ cursor: first.id })
      .where(eq(memberships.id, active.membership.id))

    await expect(listRoomMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [
        {
          ...first,
          membership: {
            id: active.membership.id,
            conversationId: active.membership.conversationId,
            status: active.membership.status,
          },
          replyTo: null,
        },
        {
          ...last,
          membership: {
            id: active.membership.id,
            conversationId: active.membership.conversationId,
            status: active.membership.status,
          },
          replyTo: null,
        },
      ],
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([{ ...active.membership, cursor: first.id }])
  })

  it('hydrates reply targets when listing messages', async () => {
    const { db } = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    const historicalMembership = {
      id: 'historical-membership',
      conversationId: 'historical-conversation',
      status: 'inactive' as const,
    }
    await db.insert(memberships).values({
      ...historicalMembership,
      roomId: active.room.id,
    })
    const [question] = await db
      .insert(messages)
      .values({
        roomId: active.room.id,
        membershipId: historicalMembership.id,
        kind: 'question',
        body: 'Which database should we use?',
      })
      .returning()

    if (!question) {
      throw new Error('Question setup did not return an inserted record')
    }

    const [answer] = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [{ kind: 'answer', body: 'SQLite.', replyToMessageId: question.id }],
    })

    if (!answer) {
      throw new Error('Answer write did not return an inserted record')
    }

    await expect(listRoomMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: expect.objectContaining({ name: 'build' }),
      messages: [
        {
          ...question,
          membership: {
            id: historicalMembership.id,
            conversationId: historicalMembership.conversationId,
            status: historicalMembership.status,
          },
          replyTo: null,
        },
        {
          ...answer,
          membership: {
            id: active.membership.id,
            conversationId: active.membership.conversationId,
            status: active.membership.status,
          },
          replyTo: {
            id: question.id,
            kind: question.kind,
            body: question.body,
            membership: {
              id: historicalMembership.id,
              conversationId: historicalMembership.conversationId,
              status: historicalMembership.status,
            },
          },
        },
      ],
    })
  })

  it('writes one message with the active membership without advancing its cursor', async () => {
    const { db } = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    const [written] = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [{ kind: 'status', body: '  work complete  ' }],
    })

    expect(written).toMatchObject({
      roomId: active.room.id,
      membershipId: active.membership.id,
      kind: 'status',
      body: '  work complete  ',
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([active.membership])
  })

  it('writes a batch atomically in input order', async () => {
    const { db } = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    const written = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [
        { kind: 'decision', body: 'Use SQLite.' },
        { kind: 'warning', body: 'Keep the database user-global.' },
        { kind: 'status', body: 'Database work is complete.' },
      ],
    })

    expect(written.map(({ kind, body }) => ({ kind, body }))).toEqual([
      { kind: 'decision', body: 'Use SQLite.' },
      { kind: 'warning', body: 'Keep the database user-global.' },
      { kind: 'status', body: 'Database work is complete.' },
    ])
    expect(written.every((message) => message.roomId === active.room.id)).toBe(true)
    expect(written.every((message) => message.membershipId === active.membership.id)).toBe(true)
    expect(written.map((message) => message.id)).toEqual(
      written.map((message) => message.id).toSorted((left, right) => left - right),
    )
  })

  it('links multiple answers to a question and cascades their deletion', async () => {
    const { db } = await createTestDatabase()
    await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    const [question] = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [{ kind: 'question', body: 'Which database should we use?' }],
    })

    if (!question) {
      throw new Error('Question write did not return an inserted record')
    }

    const answers = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [
        { kind: 'answer', body: 'SQLite.', replyToMessageId: question.id },
        { kind: 'answer', body: 'SQLite with WAL enabled.', replyToMessageId: question.id },
      ],
    })

    expect(answers.map((answer) => answer.replyToMessageId)).toEqual([question.id, question.id])

    await db.delete(messages).where(eq(messages.id, question.id))

    await expect(db.select().from(messages)).resolves.toEqual([])
  })

  it('rejects reply targets that are missing, not questions, or in another room atomically', async () => {
    const { db } = await createTestDatabase()
    await createRoom(db, { roomName: 'active', conversationId: 'conversation' })
    await createRoom(db, { roomName: 'other', conversationId: 'other-conversation' })
    const [status] = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [{ kind: 'status', body: 'Work started.' }],
    })
    const [otherQuestion] = await writeMessages(db, {
      conversationId: 'other-conversation',
      messages: [{ kind: 'question', body: 'Unrelated question?' }],
    })

    if (!status || !otherQuestion) {
      throw new Error('Reply target setup did not return inserted records')
    }

    await expect(
      writeMessages(db, {
        conversationId: 'conversation',
        messages: [
          { kind: 'decision', body: 'This row must roll back.' },
          { kind: 'answer', body: 'Missing.', replyToMessageId: 999_999 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidMessagesError)
    await expect(
      writeMessages(db, {
        conversationId: 'conversation',
        messages: [{ kind: 'answer', body: 'Not a question.', replyToMessageId: status.id }],
      }),
    ).rejects.toBeInstanceOf(InvalidMessagesError)
    await expect(
      writeMessages(db, {
        conversationId: 'conversation',
        messages: [{ kind: 'answer', body: 'Wrong room.', replyToMessageId: otherQuestion.id }],
      }),
    ).rejects.toBeInstanceOf(InvalidMessagesError)
    await expect(db.select().from(messages).orderBy(messages.id)).resolves.toEqual([
      status,
      otherQuestion,
    ])
  })

  it('rejects writes without an active membership', async () => {
    const { db } = await createTestDatabase()

    await expect(
      writeMessages(db, {
        conversationId: 'missing',
        messages: [{ kind: 'status', body: 'message' }],
      }),
    ).rejects.toBeInstanceOf(ActiveMembershipNotFoundError)
  })

  it.each([
    [[], 'an empty batch'],
    [[{ kind: 'invalid', body: 'valid' }], 'an invalid kind'],
    [[{ kind: 'status', body: '   ' }], 'a blank body'],
    [[{ kind: 'answer', body: 'missing target' }], 'an answer without a reply target'],
    [
      [{ kind: 'question', body: 'unexpected target', replyToMessageId: 1 }],
      'a non-answer with a reply target',
    ],
    [
      [
        { kind: 'status', body: 'valid' },
        { kind: 'invalid', body: 'invalid' },
      ],
      'a partially valid batch',
    ],
  ])('rejects %s without writing any rows (%s)', async (messageInput, _case) => {
    const { db } = await createTestDatabase()
    await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    await expect(
      writeMessages(db, {
        conversationId: 'conversation',
        messages: messageInput,
      } as WriteMessagesInput),
    ).rejects.toBeInstanceOf(InvalidMessagesError)
    await expect(db.select().from(messages)).resolves.toEqual([])
  })

  it('returns an empty batch for an active membership without messages', async () => {
    const { db } = await createTestDatabase()
    await createRoom(db, { roomName: 'build', conversationId: 'conversation' })

    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: expect.objectContaining({ name: 'build' }),
      messages: [],
    })
  })

  it('delivers only peer messages and advances the cursor through an interleaved batch', async () => {
    const { db } = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'active', conversationId: 'conversation' })
    const peerMembership = {
      id: 'peer-membership',
      roomId: active.room.id,
      conversationId: 'peer-conversation',
      status: 'active' as const,
    }
    await db.insert(memberships).values(peerMembership)
    await addMessage(db, active.room.id, active.membership.id)
    const second = await addMessage(db, active.room.id, peerMembership.id)
    const last = await addMessage(db, active.room.id, active.membership.id)

    const consumed = await consumeNewMessages(db, { conversationId: 'conversation' })

    expect(consumed).toEqual({
      room: active.room,
      messages: [{ ...second, replyTo: null }],
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([{ ...active.membership, cursor: last.id }])
    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [],
    })
  })

  it('delivers each peer message once when two consumers race for the same conversation', async () => {
    const { db, url } = await createTestDatabase()
    const concurrentDb = await createDatabase(url, { busyTimeoutMs: 100 })
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    const peerMembership = {
      id: 'peer-membership',
      roomId: active.room.id,
      conversationId: 'peer-conversation',
      status: 'active' as const,
    }
    await db.insert(memberships).values(peerMembership)
    const first = await addMessage(db, active.room.id, peerMembership.id)
    const second = await addMessage(db, active.room.id, peerMembership.id)

    const results = await Promise.allSettled([
      consumeNewMessages(db, { conversationId: 'conversation' }),
      consumeNewMessages(concurrentDb, { conversationId: 'conversation' }),
    ])
    const delivered = results.flatMap((result) =>
      result.status === 'fulfilled' ? (result.value?.messages ?? []) : [],
    )

    expect(delivered.map((message) => message.id).toSorted((a, b) => a - b)).toEqual([
      first.id,
      second.id,
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([{ ...active.membership, cursor: second.id }])
  })

  it('hydrates reply targets outside the new-message batch', async () => {
    const { db } = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    await db.insert(memberships).values({
      id: 'peer-membership',
      roomId: active.room.id,
      conversationId: 'peer-conversation',
      status: 'active',
    })
    const [question] = await writeMessages(db, {
      conversationId: 'conversation',
      messages: [{ kind: 'question', body: 'Which database should we use?' }],
    })

    if (!question) {
      throw new Error('Question write did not return an inserted record')
    }

    await db
      .update(memberships)
      .set({ cursor: question.id })
      .where(eq(memberships.id, active.membership.id))
    const [answer] = await db
      .insert(messages)
      .values({
        roomId: active.room.id,
        membershipId: 'peer-membership',
        kind: 'answer',
        body: 'SQLite.',
        replyToMessageId: question.id,
      })
      .returning()

    if (!answer) {
      throw new Error('Answer write did not return an inserted record')
    }

    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [
        {
          ...answer,
          replyTo: { id: question.id, kind: question.kind, body: question.body },
        },
      ],
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([{ ...active.membership, cursor: answer.id }])
  })

  it('skips messages at or before the existing cursor', async () => {
    const { db } = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    const first = await addMessage(db, active.room.id, active.membership.id)
    const peerMembership = {
      id: 'peer-membership',
      roomId: active.room.id,
      conversationId: 'peer-conversation',
      status: 'active' as const,
    }
    await db.insert(memberships).values(peerMembership)
    const second = await addMessage(db, active.room.id, peerMembership.id)
    await db
      .update(memberships)
      .set({ cursor: first.id })
      .where(eq(memberships.id, active.membership.id))

    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [{ ...second, replyTo: null }],
    })
  })

  it('skips self-authored messages while advancing the cursor', async () => {
    const { db } = await createTestDatabase()
    const active = await createRoom(db, { roomName: 'build', conversationId: 'conversation' })
    const selfAuthored = await addMessage(db, active.room.id, active.membership.id)

    await expect(consumeNewMessages(db, { conversationId: 'conversation' })).resolves.toEqual({
      room: active.room,
      messages: [],
    })
    await expect(
      db.select().from(memberships).where(eq(memberships.id, active.membership.id)),
    ).resolves.toEqual([{ ...active.membership, cursor: selfAuthored.id }])
  })
})
