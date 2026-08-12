import { z } from 'zod'

// Hook config is not a shipped asset — it is generated at install time with the absolute path of
// the installed binary baked in, then merged into the user's settings.json.

// Edit tools only. Matching all tools would fire dozens of times per read-heavy turn.
export const EDIT_TOOL_MATCHER = 'Write|Edit'

export const hookEntrySchema = z.object({
  type: z.literal('command'),
  command: z.string().min(1),
  timeout: z.number().int().positive().optional(),
})

export const hookMatcherSchema = z.object({
  matcher: z.string().min(1),
  hooks: z.array(hookEntrySchema).min(1),
})

export const hookSettingsSchema = z.object({
  hooks: z.object({
    PreToolUse: z.array(hookMatcherSchema),
    UserPromptSubmit: z.array(hookMatcherSchema),
  }),
})

export type HookEntry = z.infer<typeof hookEntrySchema>
export type HookMatcher = z.infer<typeof hookMatcherSchema>
export type HookSettings = z.infer<typeof hookSettingsSchema>

// `binaryPath` must be the absolute path of the installed binary, resolved at install time. Never
// `npx` — its cold resolution would add hundreds of milliseconds to every edit tool call.
export function buildHookSettings(binaryPath: string): HookSettings {
  if (!binaryPath.startsWith('/')) {
    throw new Error(`hook command must be an absolute path, got: ${binaryPath}`)
  }

  const preToolUse: HookEntry = { type: 'command', command: `${binaryPath} hook pre-tool-use` }
  const userPromptSubmit: HookEntry = {
    type: 'command',
    command: `${binaryPath} hook user-prompt-submit`,
  }

  return {
    hooks: {
      PreToolUse: [{ matcher: EDIT_TOOL_MATCHER, hooks: [preToolUse] }],
      UserPromptSubmit: [{ matcher: '*', hooks: [userPromptSubmit] }],
    },
  }
}
