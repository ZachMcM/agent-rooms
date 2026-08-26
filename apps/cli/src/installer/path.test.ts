import { describe, expect, it } from 'vitest'

import { removeManagedPathBlock, renderManagedPathBlock, upsertManagedPathBlock } from './path'

describe('managed PATH block', () => {
  it('renders a safely quoted shell block', () => {
    expect(renderManagedPathBlock("/Users/a b/o'hare/bin")).toContain(
      "export PATH='/Users/a b/o'\\\"'\\\"'hare/bin':$PATH",
    )
  })

  it('deduplicates old managed blocks while preserving user content', () => {
    const source = `export PATH=/usr/bin\n${renderManagedPathBlock('/old/bin')}${renderManagedPathBlock('/older/bin')}export EDITOR=vim\n`
    const result = upsertManagedPathBlock(source, '/new/bin')
    expect(result).toContain('export PATH=/usr/bin')
    expect(result).toContain('export EDITOR=vim')
    expect(result.match(/>>> coordrooms >>>/g)).toHaveLength(1)
    expect(result).toContain("'/new/bin'")
    expect(removeManagedPathBlock(result)).not.toContain('coordrooms')
  })
})
