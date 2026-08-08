import { baseConfig } from '@agent-comms/oxfmt-config'
import { defineConfig } from 'oxfmt'

export default defineConfig({
  ...baseConfig,
  ignorePatterns: [
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/.turbo/**',
    '**/out/**',
    '**/coverage/**',
    '**/migrations/**',
    '**/routeTree.gen.ts',
    '**/next-env.d.ts',
    'pnpm-lock.yaml',
  ],
})
