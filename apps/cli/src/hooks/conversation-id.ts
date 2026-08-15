import type { Readable } from 'node:stream'

import { CliError } from '../errors'
import { readHookSessionId } from './input'

const agentPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function resolveConversationId({
  agent,
  stream,
}: {
  agent: string
  stream: Readable
}): Promise<string> {
  return `${normalizeAgent(agent)}-${await readHookSessionId(stream)}`
}

function normalizeAgent(agent: string): string {
  const normalizedAgent = agent.trim()

  if (!agentPattern.test(normalizedAgent)) {
    throw new CliError(
      'invalid_arguments',
      'The --agent value must be a lowercase kebab-case slug.',
      2,
    )
  }

  return normalizedAgent
}
