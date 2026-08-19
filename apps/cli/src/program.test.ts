import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProgram, runCli } from './program'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hook program options', () => {
  it.each(['log-conversation-id', 'consume-new-messages'])(
    'requires provider for hooks %s',
    async (command) => {
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

      await expect(runCli(['hooks', command])).resolves.toBe(2)
      expect(stderr).toHaveBeenCalledWith(
        expect.stringContaining("required option '--provider <provider>' not specified"),
      )
    },
  )
})

describe('MCP program', () => {
  it('registers the stdio MCP server command', () => {
    expect(createProgram().commands.map((command) => command.name())).toContain('mcp')
  })
})
