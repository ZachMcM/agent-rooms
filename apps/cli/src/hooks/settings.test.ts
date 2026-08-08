import { describe, expect, it } from 'vitest'

import {
  EDIT_TOOL_MATCHER,
  MCP_TOOL_MATCHER,
  buildHookSettings,
  hookSettingsSchema,
} from './settings'

const BIN = '/usr/local/bin/agent-rooms'

describe('buildHookSettings', () => {
  it('produces config matching the settings.json schema', () => {
    expect(hookSettingsSchema.safeParse(buildHookSettings(BIN)).success).toBe(true)
  })

  it('bakes in the absolute binary path rather than npx', () => {
    const commands = buildHookSettings(BIN)
      .hooks.PreToolUse.flatMap((entry) => entry.hooks)
      .map((hook) => hook.command)

    expect(commands.every((command) => command.startsWith(`${BIN} `))).toBe(true)
    expect(commands.some((command) => command.includes('npx'))).toBe(false)
  })

  it('rejects a relative command path', () => {
    expect(() => buildHookSettings('agent-rooms')).toThrow(/absolute path/)
  })

  it('registers PreToolUse against our mcp tools and edit tools only', () => {
    const matchers = buildHookSettings(BIN).hooks.PreToolUse.map((entry) => entry.matcher)
    expect(matchers).toEqual([MCP_TOOL_MATCHER, EDIT_TOOL_MATCHER])
    expect(matchers).not.toContain('*')
  })

  it('routes each event to its own hook subcommand', () => {
    const settings = buildHookSettings(BIN)
    expect(settings.hooks.PreToolUse[0]?.hooks[0]?.command).toBe(`${BIN} hook pre-tool-use`)
    expect(settings.hooks.UserPromptSubmit[0]?.hooks[0]?.command).toBe(
      `${BIN} hook user-prompt-submit`,
    )
  })
})
