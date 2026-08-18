import { describe, expect, it } from 'vitest'

import { isSearchShortcut, messageFragment, parseMessageFragment } from './room-navigation'

describe('room navigation', () => {
  it('matches Cmd or Ctrl K without matching repeated keys', () => {
    expect(isSearchShortcut({ key: 'K', metaKey: true, ctrlKey: false, repeat: false })).toBe(true)
    expect(isSearchShortcut({ key: 'k', metaKey: false, ctrlKey: true, repeat: false })).toBe(true)
    expect(isSearchShortcut({ key: 'k', metaKey: false, ctrlKey: true, repeat: true })).toBe(false)
    expect(isSearchShortcut({ key: 'j', metaKey: true, ctrlKey: false, repeat: false })).toBe(false)
  })

  it('formats and parses stable positive message fragments', () => {
    expect(messageFragment(42)).toBe('message-42')
    expect(parseMessageFragment('message-42')).toBe(42)
    expect(parseMessageFragment('message-0')).toBeNull()
    expect(parseMessageFragment('message-42x')).toBeNull()
    expect(parseMessageFragment('other-42')).toBeNull()
  })
})
