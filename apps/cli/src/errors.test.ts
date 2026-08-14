import { CommanderError } from 'commander'
import { afterEach, describe, expect, it } from 'vitest'

import { CliError, handleCliError } from './errors'

const stderrWrite = process.stderr.write

afterEach(() => {
  process.stderr.write = stderrWrite
})

function captureStderr(): string[] {
  const output: string[] = []
  process.stderr.write = ((message: string | Uint8Array) => {
    output.push(String(message))
    return true
  }) as typeof process.stderr.write
  return output
}

describe('handleCliError', () => {
  it('writes CliError details and returns its exit code', () => {
    const output = captureStderr()

    expect(handleCliError(new CliError('room_name_conflict', 'Room already exists.', 1))).toBe(1)
    expect(output).toEqual([
      '{"ok":false,"error":{"code":"room_name_conflict","message":"Room already exists.","retryable":false}}\n',
    ])
  })

  it('maps invalid Commander usage to invalid_arguments', () => {
    const output = captureStderr()

    expect(
      handleCliError(
        new CommanderError(2, 'commander.unknownOption', "error: unknown option '--unknown'"),
      ),
    ).toBe(2)
    expect(output).toEqual([
      '{"ok":false,"error":{"code":"invalid_arguments","message":"error: unknown option \'--unknown\'","retryable":false}}\n',
    ])
  })

  it('returns zero without error output for successful Commander exits', () => {
    const output = captureStderr()

    expect(handleCliError(new CommanderError(0, 'commander.helpDisplayed', ''))).toBe(0)
    expect(output).toEqual([])
  })

  it('masks unexpected errors as internal_error', () => {
    const output = captureStderr()

    expect(handleCliError(new Error('sensitive failure'))).toBe(1)
    expect(output).toEqual([
      '{"ok":false,"error":{"code":"internal_error","message":"An unexpected error occurred.","retryable":false}}\n',
    ])
  })
})
