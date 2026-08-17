const startMarker = '# >>> agent-rooms >>>'
const endMarker = '# <<< agent-rooms <<<'
const blockPattern = /(^|\n)# >>> agent-rooms >>>\n[\s\S]*?\n# <<< agent-rooms <<</g

export function renderManagedPathBlock(binDirectory: string): string {
  return `${startMarker}\nexport PATH=${shellQuote(binDirectory)}:$PATH\n${endMarker}\n`
}

export function upsertManagedPathBlock(content: string, binDirectory: string): string {
  const withoutBlocks = removeManagedPathBlock(content)
  return `${withoutBlocks}${withoutBlocks && !withoutBlocks.endsWith('\n') ? '\n' : ''}${renderManagedPathBlock(binDirectory)}`
}

export function removeManagedPathBlock(content: string): string {
  return content.replace(blockPattern, '$1')
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\\"'\\\"'")}'`
}
