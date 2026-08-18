import { describe, expect, it } from 'vitest'

import { providerHookConfig } from './config'

describe('providerHookConfig', () => {
  it('quotes executable paths for shell-based hook runners', () => {
    const config = providerHookConfig("/Users/Test User/it's/bin/agent-rooms") as {
      cursor: { hooks: { sessionStart: { command: string }[] } }
    }

    expect(config.cursor.hooks.sessionStart[0]?.command).toBe(
      `'${`/Users/Test User/it's/bin/agent-rooms`.replaceAll("'", `'"'"'`)}' hooks log-conversation-id --provider cursor --event sessionStart`,
    )
  })

  it('creates the exact owned lifecycle matrix without leave hooks', () => {
    expect(providerHookConfig('/Users/test/.agent-rooms/bin/agent-rooms')).toEqual({
      claude: {
        hooks: {
          SessionStart: [
            {
              matcher: 'startup|resume|clear',
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks log-conversation-id --provider claude --event SessionStart',
                },
              ],
            },
            {
              matcher: 'compact',
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider claude --event SessionStart',
                },
              ],
            },
          ],
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider claude --event UserPromptSubmit',
                },
              ],
            },
          ],
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider claude --event PostToolUse',
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider claude --event Stop',
                },
              ],
            },
          ],
        },
      },
      codex: {
        hooks: {
          SessionStart: [
            {
              matcher: 'startup|resume|clear',
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks log-conversation-id --provider codex --event SessionStart',
                },
              ],
            },
            {
              matcher: 'compact',
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider codex --event SessionStart',
                },
              ],
            },
          ],
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider codex --event UserPromptSubmit',
                },
              ],
            },
          ],
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider codex --event PostToolUse',
                },
              ],
            },
          ],
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command:
                    '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider codex --event Stop',
                },
              ],
            },
          ],
        },
      },
      cursor: {
        hooks: {
          sessionStart: [
            {
              command:
                '/Users/test/.agent-rooms/bin/agent-rooms hooks log-conversation-id --provider cursor --event sessionStart',
            },
          ],
          postToolUse: [
            {
              command:
                '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider cursor --event postToolUse',
            },
          ],
          stop: [
            {
              command:
                '/Users/test/.agent-rooms/bin/agent-rooms hooks consume-new-messages --provider cursor --event stop',
            },
          ],
        },
      },
    })
  })
})
