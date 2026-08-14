import { afterEach, expect, it } from 'vitest'

import { writeError, writeSuccess } from './output'

const stdoutWrite = process.stdout.write
const stderrWrite = process.stderr.write

afterEach(() => {
  process.stdout.write = stdoutWrite
  process.stderr.write = stderrWrite
})

function captureStreams() {
  const stdout: string[] = []
  const stderr: string[] = []
  process.stdout.write = ((message: string | Uint8Array) => {
    stdout.push(String(message))
    return true
  }) as typeof process.stdout.write
  process.stderr.write = ((message: string | Uint8Array) => {
    stderr.push(String(message))
    return true
  }) as typeof process.stderr.write
  return { stderr, stdout }
}

it('writes successful JSON to stdout only', () => {
  const { stderr, stdout } = captureStreams()

  writeSuccess({ room: 'build' })

  expect(stdout).toEqual(['{"ok":true,"data":{"room":"build"}}\n'])
  expect(stderr).toEqual([])
})

it('writes error JSON to stderr only', () => {
  const { stderr, stdout } = captureStreams()

  writeError({ code: 'room_not_found', message: 'Room not found.', retryable: false })

  expect(stdout).toEqual([])
  expect(stderr).toEqual([
    '{"ok":false,"error":{"code":"room_not_found","message":"Room not found.","retryable":false}}\n',
  ])
})
