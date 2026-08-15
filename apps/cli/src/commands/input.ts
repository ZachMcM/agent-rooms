import { CliError } from '../errors'

export function conversationInput(conversationId: string | undefined): string {
  const trimmedConversationId = conversationId?.trim()

  if (!trimmedConversationId) {
    throw new CliError('invalid_arguments', 'A --conversation-id is required.', 2)
  }

  return trimmedConversationId
}
