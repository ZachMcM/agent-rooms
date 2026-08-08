import { z } from 'zod'

// Widening this later is mechanical — add a field and the compiler walks every call site.
// Introducing principal-passing into code that never had it is the painful refactor, so every
// handler and every domain function takes one from day one, in both local and cloud mode.
export const principalSchema = z.object({
  userId: z.string().min(1),
})

export type Principal = z.infer<typeof principalSchema>
