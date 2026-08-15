import type { Readable } from 'node:stream'

import {
  ActiveMembershipNotFoundError,
  InvalidMessagesError,
  listRoomMessages,
  MESSAGE_KINDS,
  type WriteMessageInput,
  writeMessages,
} from '@agent-rooms/db'
import type { Command } from 'commander'
import { z } from 'zod'

import { openDatabase } from '../database'
import { CliError } from '../errors'
import { writeSuccess } from '../output'
import { conversationInput } from './rooms'

interface MessageOptions {
  kind?: string
  body?: string
}

type InputStream = Readable & { isTTY?: boolean }

const bodySchema = z.string().refine((body) => Boolean(body.trim()))
const batchMessageSchema = z.strictObject({
  kind: z.enum(MESSAGE_KINDS),
  body: bodySchema,
})
const batchSchema = z.strictObject({
  messages: z.array(batchMessageSchema).min(1),
})
const singleMessageSchema = z.strictObject({
  kind: z.string().trim().pipe(z.enum(MESSAGE_KINDS)),
  body: bodySchema,
})

export async function readMessagesInput(
  options: MessageOptions,
  stream: InputStream,
): Promise<WriteMessageInput[]> {
  const input = stream.isTTY === true ? '' : await readStream(stream)
  const hasBatchInput = Boolean(input.trim())
  const hasKind = options.kind !== undefined
  const hasBody = options.body !== undefined

  if (hasBatchInput && (hasKind || hasBody)) {
    throw invalidArguments('Provide message flags or a JSON batch on stdin, not both.')
  }

  if (hasKind !== hasBody) {
    throw invalidArguments('--kind and --body must be provided together.')
  }

  if (hasKind && hasBody) {
    const parsed = singleMessageSchema.safeParse({ kind: options.kind, body: options.body })

    if (!parsed.success) {
      throw invalidArguments('Message flags must include a valid kind and non-empty body.')
    }

    return [parsed.data]
  }

  if (!hasBatchInput) {
    throw invalidArguments('Provide --kind and --body or a JSON batch on stdin.')
  }

  let payload: unknown

  try {
    payload = JSON.parse(input)
  } catch {
    throw invalidArguments('Batch input must contain valid JSON.')
  }

  const parsed = batchSchema.safeParse(payload)

  if (!parsed.success) {
    throw invalidArguments('Batch input must contain a non-empty messages array with valid items.')
  }

  return parsed.data.messages
}

export function addListRoomMessagesCommand(program: Command): void {
  program
    .command('list-room-messages')
    .option('--conversation-id <id>')
    .exitOverride()
    .action(async (options: { conversationId?: string }) => {
      const conversationId = conversationInput(options.conversationId)
      const db = await openDatabase()

      writeSuccess(await listRoomMessages(db, { conversationId }))
    })
}

export function addWriteMessagesCommand(program: Command): void {
  program
    .command('write-messages')
    .option('--conversation-id <id>')
    .option('--kind <kind>')
    .option('--body <body>')
    .exitOverride()
    .action(async (options: { conversationId?: string; kind?: string; body?: string }) => {
      const conversationId = conversationInput(options.conversationId)
      const messageInput = await readMessagesInput(options, process.stdin)
      const db = await openDatabase()

      try {
        writeSuccess(await writeMessages(db, { conversationId, messages: messageInput }))
      } catch (error) {
        if (error instanceof ActiveMembershipNotFoundError) {
          throw new CliError('active_membership_not_found', error.message, 1)
        }

        if (error instanceof InvalidMessagesError) {
          throw new CliError('invalid_arguments', error.message, 2)
        }

        throw error
      }
    })
}

async function readStream(stream: Readable): Promise<string> {
  let input = ''

  for await (const chunk of stream) {
    input += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
  }

  return input
}

function invalidArguments(message: string): CliError {
  return new CliError('invalid_arguments', message, 2)
}
