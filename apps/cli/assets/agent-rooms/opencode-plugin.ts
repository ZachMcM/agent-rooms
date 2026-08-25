import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const executable = join(homedir(), '.agent-rooms', 'bin', 'agent-rooms')

type PromptClient = {
  session: {
    prompt: (input: {
      path: { id: string }
      body: { noReply: true; parts: Array<{ type: 'text'; text: string }> }
    }) => Promise<unknown>
  }
}

type HookEvent = { type: string; properties: Record<string, unknown> }

type TextPart = { type?: string; text?: string; synthetic?: boolean }

type Hooks = {
  event?: (input: { event: HookEvent }) => Promise<void>
  'chat.message'?: (input: { sessionID: string }, output: { parts: TextPart[] }) => Promise<void>
  'tool.execute.after'?: (
    input: { sessionID: string; tool: string; callID: string },
    output: { output?: string },
  ) => Promise<void>
}

type Plugin = (context: { client: PromptClient }) => Hooks | Promise<Hooks>

const consumeQueues = new Map<string, Promise<unknown>>()

async function serializeConsume<T>(sessionID: string, operation: () => Promise<T>): Promise<T> {
  const previous = consumeQueues.get(sessionID) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(operation)
  consumeQueues.set(sessionID, current)
  try {
    return await current
  } finally {
    if (consumeQueues.get(sessionID) === current) consumeQueues.delete(sessionID)
  }
}

function runHook(
  command: 'log-conversation-id' | 'consume-new-messages',
  event: string,
  sessionID: string,
  includeConversationId = false,
): Promise<string> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      executable,
      [
        'hooks',
        command,
        '--provider',
        'opencode',
        '--event',
        event,
        ...(includeConversationId ? ['--include-conversation-id'] : []),
        '--plain',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolveResult(Buffer.concat(stdout).toString('utf8').trim())
      } else {
        reject(
          new Error(
            Buffer.concat(stderr).toString('utf8').trim() ||
              `${executable} exited with code ${code}.`,
          ),
        )
      }
    })
    child.stdin.end(JSON.stringify({ session_id: sessionID }))
  })
}

async function injectContext(client: PromptClient, sessionID: string, text: string): Promise<void> {
  if (!text) return
  await client.session.prompt({
    path: { id: sessionID },
    body: { noReply: true, parts: [{ type: 'text', text }] },
  })
}

async function consume(
  client: PromptClient,
  sessionID: string,
  event: string,
  includeConversationId = false,
): Promise<void> {
  await serializeConsume(sessionID, async () => {
    await injectContext(
      client,
      sessionID,
      await runHook('consume-new-messages', event, sessionID, includeConversationId),
    )
  })
}

function consumeText(sessionID: string, event: string): Promise<string> {
  return serializeConsume(sessionID, () => runHook('consume-new-messages', event, sessionID))
}

export const AgentRoomsIdentity: Plugin = async ({ client }) => ({
  event: async ({ event }) => {
    try {
      if (event.type === 'session.created') {
        const info = event.properties.info as { id?: unknown } | undefined
        if (typeof info?.id === 'string') {
          await injectContext(
            client,
            info.id,
            await runHook('log-conversation-id', event.type, info.id),
          )
        }
      } else if (event.type === 'session.compacted') {
        const sessionID = event.properties.sessionID
        if (typeof sessionID === 'string') {
          await consume(client, sessionID, event.type, true)
        }
      }
    } catch (error) {
      console.error('[agent-rooms] identity failed:', error)
    }
  },
})

export const AgentRoomsDelivery: Plugin = async ({ client }) => ({
  event: async ({ event }) => {
    try {
      if (event.type === 'session.idle') {
        const sessionID = event.properties.sessionID
        if (typeof sessionID === 'string') await consume(client, sessionID, event.type)
      }
    } catch (error) {
      console.error('[agent-rooms] delivery failed:', error)
    }
  },
  'chat.message': async (input, output) => {
    try {
      const text = await consumeText(input.sessionID, 'chat.message')
      if (!text) return
      output.parts.unshift({ type: 'text', text, synthetic: true })
    } catch (error) {
      console.error('[agent-rooms] chat.message failed:', error)
    }
  },
  'tool.execute.after': async (input, output) => {
    try {
      const text = await consumeText(input.sessionID, 'tool.execute.after')
      if (!text) return
      output.output = `${text}\n\n${output.output ?? ''}`
    } catch (error) {
      console.error('[agent-rooms] tool.execute.after failed:', error)
    }
  },
})
