import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createDatabase, runMigrations } from '@agent-rooms/db'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, describe, expect, it } from 'vitest'

import { createMcpServer } from './mcp'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe('Agent Rooms MCP server', () => {
  it('exposes room coordination tools over MCP', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'agent-rooms-mcp-'))
    directories.push(directory)
    const database = await createDatabase(`file:${join(directory, 'db.sqlite')}`)
    await runMigrations(database)
    const server = createMcpServer(async () => database, '1.2.3')
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      'create_room',
      'join_room',
      'list_active_rooms',
      'list_room_messages',
      'write_messages',
      'leave_room',
    ])
    expect(
      tools.tools.find((tool) => tool.name === 'list_active_rooms')?.annotations,
    ).toMatchObject({
      readOnlyHint: true,
    })

    const created = await client.callTool({
      name: 'create_room',
      arguments: { roomName: 'mcp-test', conversationId: 'conversation-a' },
    })
    expect(created.structuredContent).toMatchObject({ result: { room: { name: 'mcp-test' } } })

    const rooms = await client.callTool({ name: 'list_active_rooms', arguments: {} })
    expect(rooms.structuredContent).toMatchObject({ result: [{ name: 'mcp-test' }] })

    const written = await client.callTool({
      name: 'write_messages',
      arguments: {
        conversationId: 'conversation-a',
        messages: [{ kind: 'decision', body: 'Use MCP.' }],
      },
    })
    expect(written.structuredContent).toMatchObject({ result: [{ body: 'Use MCP.' }] })

    const messages = await client.callTool({
      name: 'list_room_messages',
      arguments: { conversationId: 'conversation-a' },
    })
    expect(messages.structuredContent).toMatchObject({
      result: { messages: [{ body: 'Use MCP.' }] },
    })

    const conflict = await client.callTool({
      name: 'create_room',
      arguments: { roomName: 'mcp-test', conversationId: 'conversation-b' },
    })
    expect(conflict.isError).toBe(true)
    expect(conflict.structuredContent).toEqual({
      code: 'room_name_conflict',
      message: 'Room name already exists: mcp-test',
    })

    const left = await client.callTool({
      name: 'leave_room',
      arguments: { roomName: 'mcp-test', conversationId: 'conversation-a' },
    })
    expect(left.structuredContent).toMatchObject({ result: { membership: { status: 'inactive' } } })

    await client.close()
    await server.close()
  })

  it('opens the database once, retrying after a failed open', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'agent-rooms-mcp-'))
    directories.push(directory)
    const database = await createDatabase(`file:${join(directory, 'db.sqlite')}`)
    await runMigrations(database)

    let opens = 0
    let failOnce = true
    const open = async () => {
      opens += 1
      if (failOnce) {
        failOnce = false
        throw new Error('database unavailable')
      }
      return database
    }
    const server = createMcpServer(open, '1.2.3')
    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const failed = await client.callTool({ name: 'list_active_rooms', arguments: {} })
    expect(failed.isError).toBe(true)
    expect(failed.structuredContent).toEqual({
      code: 'internal_error',
      message: 'Agent Rooms could not complete this operation.',
    })

    const recovered = await client.callTool({ name: 'list_active_rooms', arguments: {} })
    expect(recovered.isError).toBeUndefined()

    const cached = await client.callTool({ name: 'list_active_rooms', arguments: {} })
    expect(cached.isError).toBeUndefined()

    expect(opens).toBe(2)

    await client.close()
    await server.close()
  })
})
