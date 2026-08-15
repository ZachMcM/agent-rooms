import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { readMessagesInput } from './messages'

function read(options: { kind?: string; body?: string }, input: string = '') {
  return readMessagesInput(options, Readable.from([input]))
}

describe('readMessagesInput', () => {
  it('normalizes single-message flags and preserves the body', async () => {
    await expect(read({ kind: ' status ', body: '  work complete  ' })).resolves.toEqual([
      { kind: 'status', body: '  work complete  ' },
    ])
  })

  it('reads a strict JSON batch from stdin in input order', async () => {
    await expect(
      read(
        {},
        JSON.stringify({
          messages: [
            { kind: 'decision', body: 'Use SQLite.' },
            { kind: 'status', body: '  Work is complete.  ' },
          ],
        }),
      ),
    ).resolves.toEqual([
      { kind: 'decision', body: 'Use SQLite.' },
      { kind: 'status', body: '  Work is complete.  ' },
    ])
  })

  it('does not wait for batch input from a TTY', async () => {
    const stream = Readable.from(['ignored']) as Readable & { isTTY?: boolean }
    stream.isTTY = true

    await expect(readMessagesInput({ kind: 'status', body: 'done' }, stream)).resolves.toEqual([
      { kind: 'status', body: 'done' },
    ])
  })

  it.each([
    [{}, '', 'no input'],
    [{ kind: 'status' }, '', 'a missing body flag'],
    [{ body: 'message' }, '', 'a missing kind flag'],
    [{ kind: 'invalid', body: 'message' }, '', 'an invalid flag kind'],
    [{ kind: 'status', body: '   ' }, '', 'a blank flag body'],
    [{ kind: 'status', body: 'message' }, '{"messages":[]}', 'mixed modes'],
    [{}, 'not json', 'malformed JSON'],
    [{}, '[]', 'a non-object payload'],
    [{}, '{"messages":[]}', 'an empty batch'],
    [{}, '{"messages":[{"kind":"invalid","body":"message"}]}', 'an invalid batch kind'],
    [{}, '{"messages":[{"kind":"status","body":"   "}]}', 'a blank batch body'],
    [{}, '{"messages":[{"kind":"status","body":"message","extra":true}]}', 'an extra item key'],
    [{}, '{"messages":[{"kind":"status","body":"message"}],"extra":true}', 'an extra root key'],
  ])('rejects %s with %s (%s)', async (options, input, _case) => {
    await expect(read(options, input)).rejects.toMatchObject({
      code: 'invalid_arguments',
      exitCode: 2,
    })
  })
})
