import { CommanderError } from 'commander'

import { writeError, writeHumanError } from './output'

export class CliError extends Error {
  readonly code: string
  readonly exitCode: number
  readonly retryable: boolean
  readonly output: 'json' | 'human'

  constructor(
    code: string,
    message: string,
    exitCode: number,
    retryable: boolean = false,
    output: 'json' | 'human' = 'json',
  ) {
    super(message)
    this.name = 'CliError'
    this.code = code
    this.exitCode = exitCode
    this.retryable = retryable
    this.output = output
  }
}

export function handleCliError(error: unknown, human: boolean = false): number {
  if (isSuccessfulCommanderExit(error)) {
    return 0
  }

  if (error instanceof CommanderError || isCommanderError(error)) {
    if (human) {
      writeHumanError(error.message)
      return 2
    }
    writeError({ code: 'invalid_arguments', message: error.message, retryable: false })
    return 2
  }

  if (error instanceof CliError) {
    if (error.output === 'human') {
      writeHumanError(error.message)
      return error.exitCode
    }
    writeError({ code: error.code, message: error.message, retryable: error.retryable })
    return error.exitCode
  }

  if (human) writeHumanError('An unexpected error occurred.')
  else
    writeError({
      code: 'internal_error',
      message: 'An unexpected error occurred.',
      retryable: false,
    })
  return 1
}

function isCommanderError(error: unknown): error is CommanderError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('commander.') &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

function isSuccessfulCommanderExit(error: unknown): boolean {
  return (error instanceof CommanderError || isCommanderError(error)) && error.exitCode === 0
}
