import { listRoomMessages } from '@agent-rooms/db'
import type { Command } from 'commander'

import { openDatabase } from '../database'
import { writeSuccess } from '../output'
import { conversationInput } from './input'

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
