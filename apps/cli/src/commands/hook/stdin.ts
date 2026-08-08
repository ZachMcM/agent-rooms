import type { z } from 'zod'

export async function readHookPayload<TSchema extends z.ZodType>(
  schema: TSchema,
  stream: NodeJS.ReadStream = process.stdin,
): Promise<z.infer<TSchema>> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')))
}
