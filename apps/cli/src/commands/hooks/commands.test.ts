import { Readable } from 'node:stream'

import { consumeNewMessages } from '@agent-rooms/db'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { openDatabase } from '../../database'
import { addHooksCommand } from './commands'

vi.mock('../../database', () => ({ openDatabase: vi.fn() }))
vi.mock('@agent-rooms/db', () => ({ consumeNewMessages: vi.fn() }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(openDatabase).mockReset()
  vi.mocked(consumeNewMessages).mockReset()
})

describe('hook commands', () => {
  it('injects only the structured conversation ID', async () => {
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(
      Readable.from(['{"session_id":"session-123"}']) as unknown as typeof process.stdin,
    )
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const program = new Command().exitOverride()
    addHooksCommand(program)

    await program.parseAsync(
      ['hooks', 'log-conversation-id', '--provider', 'claude', '--event', 'SessionStart'],
      { from: 'user' },
    )

    expect(stdout).toHaveBeenCalledWith(
      '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<conversation-id>claude-session-123</conversation-id>"}}\n',
    )
  })

  it('emits the Codex SessionStart envelope', async () => {
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(
      Readable.from(['{"session_id":"session-123"}']) as unknown as typeof process.stdin,
    )
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const program = new Command().exitOverride()
    addHooksCommand(program)

    await program.parseAsync(
      ['hooks', 'log-conversation-id', '--provider', 'codex', '--event', 'SessionStart'],
      { from: 'user' },
    )

    expect(stdout).toHaveBeenCalledWith(
      '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<conversation-id>codex-session-123</conversation-id>"}}\n',
    )
  })

  it('emits the conversation ID before unread messages in one compact response', async () => {
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(
      Readable.from(['{"session_id":"session-123"}']) as unknown as typeof process.stdin,
    )
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const db = {}
    vi.mocked(openDatabase).mockResolvedValue(db as never)
    vi.mocked(consumeNewMessages).mockResolvedValue({ messages: [{ body: 'hello' }] } as never)
    const program = new Command().exitOverride()
    addHooksCommand(program)

    await program.parseAsync(
      [
        'hooks',
        'consume-new-messages',
        '--provider',
        'codex',
        '--event',
        'SessionStart',
        '--include-conversation-id',
      ],
      { from: 'user' },
    )

    expect(consumeNewMessages).toHaveBeenCalledWith(db, { conversationId: 'codex-session-123' })
    expect(stdout).toHaveBeenCalledWith(
      '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<conversation-id>codex-session-123</conversation-id>\\n<new-messages>{\\"messages\\":[{\\"body\\":\\"hello\\"}]}</new-messages>"}}\n',
    )
  })

  it.each([
    [
      ['--provider', 'opencode', '--event', 'SessionStart'],
      'The --provider value must be one of claude, codex, or cursor.',
    ],
    [
      ['--provider', 'claude', '--event', 'sessionStart'],
      'The --event value must be one of SessionStart, UserPromptSubmit, PostToolUse, Stop for claude.',
    ],
    [
      ['--provider', 'cursor', '--event', 'SessionStart'],
      'The --event value must be one of sessionStart, postToolUse, stop for cursor.',
    ],
  ])('rejects invalid identity before opening the database', async (flags, message) => {
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(
      Readable.from([]) as unknown as typeof process.stdin,
    )
    const program = new Command().exitOverride()
    addHooksCommand(program)

    await expect(
      program.parseAsync(['hooks', 'consume-new-messages', ...flags], { from: 'user' }),
    ).rejects.toMatchObject({ code: 'invalid_arguments', message })
    expect(openDatabase).not.toHaveBeenCalled()
  })

  it('requires a hook event', async () => {
    const program = new Command().exitOverride()
    addHooksCommand(program)

    await expect(
      program.parseAsync(['hooks', 'log-conversation-id', '--provider', 'claude'], {
        from: 'user',
      }),
    ).rejects.toMatchObject({ code: 'commander.missingMandatoryOptionValue' })
  })
})
