import { describe, expect, it } from 'vitest'

import {
  appendJsoncArrayValue,
  removeJsoncArrayValue,
  removeJsoncProperty,
  reconcileJsoncObjectArray,
  setJsoncObjectProperty,
  setJsoncProperty,
} from './jsonc'

describe('JSONC patches', () => {
  const source = '{\n  // retain this\n  "unknown": true,\n  "skills": ["existing",],\n}\n'

  it('updates a top-level property without rewriting comments or unknown keys', () => {
    const result = setJsoncProperty(source, 'enabled', false)
    expect(result).toContain('// retain this')
    expect(result).toContain('"unknown": true')
    expect(result).toContain('"enabled": false')
  })

  it('appends uniquely and removes only managed array values', () => {
    const appended = appendJsoncArrayValue(source, 'skills', 'agent-rooms')
    expect(appendJsoncArrayValue(appended, 'skills', 'agent-rooms')).toBe(appended)
    expect(removeJsoncArrayValue(appended, 'skills', 'agent-rooms')).toContain('"existing"')
  })

  it('removes a property without damaging neighboring content', () => {
    expect(removeJsoncProperty(source, 'unknown')).not.toContain('"unknown"')
  })

  it('sets an event inside hooks without rewriting unrelated event source text', () => {
    const hooks = `{
  "hooks": {
    // retain this event exactly
    "PreToolUse": [{ "matcher": "Bash", "hooks": ["existing"] }],
    "Stop": ["stop",],
  },
  "unknown": true,
}
`
    const unrelatedEvent = '"PreToolUse": [{ "matcher": "Bash", "hooks": ["existing"] }],'
    const result = setJsoncObjectProperty(hooks, 'hooks', 'UserPromptSubmit', ['agent-rooms'])

    expect(result).toContain(unrelatedEvent)
    expect(result).toContain('"Stop": ["stop",],')
    expect(result).toContain('"UserPromptSubmit": [\n      "agent-rooms"\n    ]')
    expect(setJsoncObjectProperty(result, 'hooks', 'UserPromptSubmit', ['agent-rooms'])).toBe(
      result,
    )

    const updated = setJsoncObjectProperty(result, 'hooks', 'PreToolUse', ['replacement'])
    expect(updated).toContain('"Stop": ["stop",],')
    expect(updated).toContain('"PreToolUse": [\n      "replacement"\n    ]')
  })

  it('creates a missing object property and rejects a non-object parent', () => {
    const created = setJsoncObjectProperty('{\n}\n', 'hooks', 'UserPromptSubmit', [])
    expect(created).toContain('"hooks": {\n    "UserPromptSubmit": []\n  }')
    expect(setJsoncObjectProperty(created, 'hooks', 'UserPromptSubmit', [])).toBe(created)
    expect(() =>
      setJsoncObjectProperty('{ "hooks": [] }', 'hooks', 'UserPromptSubmit', []),
    ).toThrow('JSONC property hooks is not an object.')
  })

  it('reconciles a hook array without rewriting retained entries or their comments', () => {
    const hookSource = `{
  "hooks": {
    "UserPromptSubmit": [
      // retain this comment
      { "command": "keep", "nested": ["format",] },
      { "command": "remove" }, // remove this entry
      { "command": "keep", "nested": ["format",] },
    ],
  },
}
`
    const retained = '// retain this comment\n      { "command": "keep", "nested": ["format",] }'
    const result = reconcileJsoncObjectArray(
      hookSource,
      'hooks',
      'UserPromptSubmit',
      [{ command: 'remove' }],
      [{ command: 'keep', nested: ['format'] }, { command: 'add' }],
    )

    expect(result).toContain(retained)
    expect(result.match(/"command": "keep"/g)).toHaveLength(2)
    expect(result).not.toContain('"command": "remove"')
    expect(result).toContain('{\n        "command": "add"\n      }')
    expect(
      reconcileJsoncObjectArray(
        result,
        'hooks',
        'UserPromptSubmit',
        [{ command: 'remove' }],
        [{ command: 'keep', nested: ['format'] }, { command: 'add' }],
      ),
    ).toBe(result)
  })

  it('removes the last owned duplicate while preserving user-authored duplicates', () => {
    const duplicate = { command: 'same' }
    const duplicateSource = `{
  "hooks": {
    "UserPromptSubmit": [
      // first source must remain
      { "command": "same" },
      // second owned source
      { "command": "same" },
    ],
  },
}
`
    const firstEntry = '// first source must remain\n      { "command": "same" },'
    const normallyAppended = reconcileJsoncObjectArray(
      duplicateSource,
      'hooks',
      'UserPromptSubmit',
      [],
      [duplicate],
    )
    const removed = reconcileJsoncObjectArray(
      duplicateSource,
      'hooks',
      'UserPromptSubmit',
      [duplicate],
      [],
    )
    const forced = reconcileJsoncObjectArray(
      removed,
      'hooks',
      'UserPromptSubmit',
      [],
      [],
      [duplicate],
    )

    expect(normallyAppended).toBe(duplicateSource)
    expect(removed).toContain(firstEntry)
    expect(removed.match(/"command": "same"/g)).toHaveLength(1)
    expect(forced.match(/"command": "same"/g)).toHaveLength(2)
  })

  it('replaces a managed hook without retaining its blank line', () => {
    const source = `{
  "hooks": {
    "SessionStart": [
      { "command": "old" },
    ],
  },
}
`
    const result = reconcileJsoncObjectArray(
      source,
      'hooks',
      'SessionStart',
      [{ command: 'old' }],
      [],
      [{ command: 'new' }],
    )

    expect(result).toBe(`{
  "hooks": {
    "SessionStart": [
      {
        "command": "new"
      }
    ],
  },
}
`)
  })

  it('creates missing arrays and rejects non-array hook events', () => {
    expect(
      reconcileJsoncObjectArray('{\n}\n', 'hooks', 'UserPromptSubmit', [], ['added']),
    ).toContain('"UserPromptSubmit": [\n      "added"\n    ]')
    expect(() =>
      reconcileJsoncObjectArray(
        '{ "hooks": { "UserPromptSubmit": {} } }',
        'hooks',
        'UserPromptSubmit',
        [],
        [],
      ),
    ).toThrow('JSONC property hooks.UserPromptSubmit is not an array.')
  })
})
