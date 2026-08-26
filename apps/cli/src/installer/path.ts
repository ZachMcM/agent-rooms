const startMarker = '# >>> coordrooms >>>'
const endMarker = '# <<< coordrooms <<<'
const blockPattern = /(^|\n)# >>> coordrooms >>>\n[\s\S]*?\n# <<< coordrooms <<</g

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
