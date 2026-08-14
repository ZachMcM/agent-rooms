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
