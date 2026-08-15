import {
  ActiveMembershipConflictError,
  createRoom,
  joinRoom,
  leaveRoom,
  listRooms,
  MembershipConflictError,
  MembershipNotFoundError,
  RoomNameConflictError,
  RoomNotFoundError,
} from '@agent-rooms/db'
import type { Command } from 'commander'

import { openDatabase } from '../database'
import { CliError } from '../errors'
import { writeSuccess } from '../output'

export function addCreateRoomCommand(program: Command): void {
  program
    .command('create-room <room-name>')
    .option('--conversation-id <id>')
    .exitOverride()
    .action(async (roomName: string, options: { conversationId?: string }) => {
      const input = roomInput(roomName, options.conversationId)
      const db = await openDatabase()

      try {
        writeSuccess(await createRoom(db, input))
      } catch (error) {
        if (error instanceof RoomNameConflictError) {
          throw new CliError('room_name_conflict', error.message, 1)
        }

        if (error instanceof ActiveMembershipConflictError) {
          throw new CliError('active_membership_conflict', error.message, 1)
        }

        throw error
      }
    })
}

export function addJoinRoomCommand(program: Command): void {
  program
    .command('join-room <room-name>')
    .option('--conversation-id <id>')
    .exitOverride()
    .action(async (roomName: string, options: { conversationId?: string }) => {
      const input = roomInput(roomName, options.conversationId)
      const db = await openDatabase()

      try {
        writeSuccess(await joinRoom(db, input))
      } catch (error) {
        if (error instanceof RoomNotFoundError) {
          throw new CliError('room_not_found', error.message, 1)
        }

        if (error instanceof MembershipConflictError) {
          throw new CliError('membership_conflict', error.message, 1)
        }

        if (error instanceof ActiveMembershipConflictError) {
          throw new CliError('active_membership_conflict', error.message, 1)
        }

        throw error
      }
    })
}

export function addListRoomsCommand(program: Command): void {
  program
    .command('list-rooms')
    .option('--conversation-id <id>')
    .exitOverride()
    .action(async (options: { conversationId?: string }) => {
      const conversationId = conversationInput(options.conversationId)
      const db = await openDatabase()

      writeSuccess(await listRooms(db, { conversationId }))
    })
}

export function addLeaveRoomCommand(program: Command): void {
  program
    .command('leave-room <room-name>')
    .option('--conversation-id <id>')
    .exitOverride()
    .action(async (roomName: string, options: { conversationId?: string }) => {
      const input = roomInput(roomName, options.conversationId)
      const db = await openDatabase()

      try {
        writeSuccess(await leaveRoom(db, input))
      } catch (error) {
        if (error instanceof RoomNotFoundError) {
          throw new CliError('room_not_found', error.message, 1)
        }

        if (error instanceof MembershipNotFoundError) {
          throw new CliError('membership_not_found', error.message, 1)
        }

        throw error
      }
    })
}

function roomInput(roomName: string, conversationId: string | undefined) {
  const trimmedRoomName = roomName.trim()
  const trimmedConversationId = conversationId?.trim()

  if (!trimmedRoomName || !trimmedConversationId) {
    throw new CliError('invalid_arguments', 'A room name and --conversation-id are required.', 2)
  }

  return { roomName: trimmedRoomName, conversationId: trimmedConversationId }
}

function conversationInput(conversationId: string | undefined): string {
  const trimmedConversationId = conversationId?.trim()

  if (!trimmedConversationId) {
    throw new CliError('invalid_arguments', 'A --conversation-id is required.', 2)
  }

  return trimmedConversationId
}
