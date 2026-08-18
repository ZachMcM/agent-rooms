export function isSearchShortcut(
  event: Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey' | 'repeat'>,
) {
  return !event.repeat && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
}

export function messageFragment(messageId: number) {
  return `message-${messageId}`
}

export function parseMessageFragment(hash: string) {
  const match = /^message-([1-9]\d*)$/.exec(hash)
  if (!match) return null

  const messageId = Number(match[1])
  return Number.isSafeInteger(messageId) ? messageId : null
}
