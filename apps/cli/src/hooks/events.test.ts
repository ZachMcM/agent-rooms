import { describe, expect, it } from 'vitest'

import { hookInputSchema, preToolUseOutputSchema } from './events'

const base = {
  session_id: 'sess_1',
  transcript_path: '/home/zach/.claude/projects/x/transcript.jsonl',
  cwd: '/home/zach/project',
}

describe('hookInputSchema', () => {
  it('discriminates a PreToolUse payload', () => {
    const parsed = hookInputSchema.parse({
      ...base,
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: '/tmp/a.ts' },
    })
    expect(parsed.hook_event_name).toBe('PreToolUse')
  })

  it('discriminates a UserPromptSubmit payload', () => {
    const parsed = hookInputSchema.parse({ ...base, hook_event_name: 'UserPromptSubmit' })
    expect(parsed.hook_event_name).toBe('UserPromptSubmit')
  })

  it('tolerates unknown fields so a new Claude Code release does not break every edit', () => {
    const parsed = hookInputSchema.parse({
      ...base,
      hook_event_name: 'UserPromptSubmit',
      some_future_field: 'whatever',
    })
    expect(parsed.session_id).toBe('sess_1')
  })

  it('rejects a payload without a session id, since that is the durable identity', () => {
    expect(
      hookInputSchema.safeParse({ ...base, session_id: '', hook_event_name: 'UserPromptSubmit' })
        .success,
    ).toBe(false)
  })
})

describe('preToolUseOutputSchema', () => {
  it('allows rewriting tool input and adding context in one response', () => {
    const result = preToolUseOutputSchema.safeParse({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        updatedInput: { sessionId: 'sess_1' },
        additionalContext: 'A sibling agent chose snake_case at the API boundary.',
      },
    })
    expect(result.success).toBe(true)
  })
})
