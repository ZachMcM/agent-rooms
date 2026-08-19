import pc from 'picocolors'

export interface ErrorOutput {
  code: string
  message: string
  retryable: boolean
}

export function writeSuccess(data: unknown): void {
  process.stdout.write(`${JSON.stringify({ ok: true, data })}\n`)
}

export function writeError(error: ErrorOutput): void {
  process.stderr.write(`${JSON.stringify({ ok: false, error })}\n`)
}

export function writeHumanError(message: string): void {
  const color = process.stderr.isTTY === true && !process.env.NO_COLOR && !process.env.CI
  process.stderr.write(`${color ? pc.createColors(true).red('✖') : 'Error:'} ${message}\n`)
}
