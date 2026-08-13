import { z } from 'zod'

// The stdin/stdout contract with Claude Code. Verified against
// https://code.claude.com/docs/en/hooks — field names are theirs, snake_case going in and
// camelCase coming out.
//
// Both payload schemas are loose on purpose: Claude Code adds fields between versions, and a
// strict object would turn every new field into a hook crash on every edit tool call.

const hookInputBase = z.object({
  session_id: z.string().min(1),
  transcript_path: z.string().min(1),
  cwd: z.string().min(1),
})

export const preToolUseInputSchema = hookInputBase.extend({
  hook_event_name: z.literal('PreToolUse'),
  tool_name: z.string().min(1),
  tool_input: z.record(z.string(), z.unknown()),
  tool_use_id: z.string().optional(),
})

export const userPromptSubmitInputSchema = hookInputBase.extend({
  hook_event_name: z.literal('UserPromptSubmit'),
  user_message: z.string().optional(),
})

export const hookInputSchema = z.discriminatedUnion('hook_event_name', [
  preToolUseInputSchema,
  userPromptSubmitInputSchema,
])

// `additionalContext` is what makes the injection design work at all — the hook can add context,
// not just allow/deny/ask. `updatedInput` rewrites tool call params; unused, since the agent
// carries the conversation id itself as a flag.
export const preToolUseOutputSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.literal('PreToolUse'),
    permissionDecision: z.enum(['allow', 'deny', 'ask']).optional(),
    permissionDecisionReason: z.string().optional(),
    updatedInput: z.record(z.string(), z.unknown()).optional(),
    additionalContext: z.string().optional(),
  }),
})

export const userPromptSubmitOutputSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.literal('UserPromptSubmit'),
    additionalContext: z.string().optional(),
  }),
})

export type PreToolUseInput = z.infer<typeof preToolUseInputSchema>
export type UserPromptSubmitInput = z.infer<typeof userPromptSubmitInputSchema>
export type HookInput = z.infer<typeof hookInputSchema>
export type PreToolUseOutput = z.infer<typeof preToolUseOutputSchema>
export type UserPromptSubmitOutput = z.infer<typeof userPromptSubmitOutputSchema>
