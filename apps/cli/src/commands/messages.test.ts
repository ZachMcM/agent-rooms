import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { readMessagesInput } from './messages'

function read(options: { kind?: string; body?: string; replyTo?: string }, input: string = '') {
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
            { kind: 'answer', body: '  Work is complete.  ', replyToMessageId: 42 },
          ],
        }),
      ),
    ).resolves.toEqual([
      { kind: 'decision', body: 'Use SQLite.' },
      { kind: 'answer', body: '  Work is complete.  ', replyToMessageId: 42 },
    ])
  })

  it('parses an answer and its reply target from flags', async () => {
    await expect(read({ kind: ' answer ', body: 'Use SQLite.', replyTo: '42' })).resolves.toEqual([
      { kind: 'answer', body: 'Use SQLite.', replyToMessageId: 42 },
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
    [{ kind: 'answer', body: 'message' }, '', 'an answer without a reply target'],
    [{ kind: 'status', body: 'message', replyTo: '1' }, '', 'a non-answer reply target'],
    [{ kind: 'answer', body: 'message', replyTo: '0' }, '', 'a zero reply target'],
    [{ kind: 'answer', body: 'message', replyTo: '1.5' }, '', 'a fractional reply target'],
    [{ kind: 'answer', body: 'message', replyTo: 'invalid' }, '', 'a nonnumeric reply target'],
    [{ replyTo: '1' }, '', 'a reply target without message flags'],
    [{ kind: 'status', body: 'message' }, '{"messages":[]}', 'mixed modes'],
    [{}, 'not json', 'malformed JSON'],
    [{}, '[]', 'a non-object payload'],
    [{}, '{"messages":[]}', 'an empty batch'],
    [{}, '{"messages":[{"kind":"invalid","body":"message"}]}', 'an invalid batch kind'],
    [{}, '{"messages":[{"kind":"status","body":"   "}]}', 'a blank batch body'],
    [{}, '{"messages":[{"kind":"answer","body":"message"}]}', 'a batch answer without a target'],
    [
      {},
      '{"messages":[{"kind":"status","body":"message","replyToMessageId":1}]}',
      'a batch non-answer reply target',
    ],
    [
      {},
      '{"messages":[{"kind":"answer","body":"message","replyToMessageId":"1"}]}',
      'a string batch reply target',
    ],
    [{}, '{"messages":[{"kind":"status","body":"message","extra":true}]}', 'an extra item key'],
    [{}, '{"messages":[{"kind":"status","body":"message"}],"extra":true}', 'an extra root key'],
  ])('rejects %s with %s (%s)', async (options, input, _case) => {
    await expect(read(options, input)).rejects.toMatchObject({
      code: 'invalid_arguments',
      exitCode: 2,
    })
  })
})
