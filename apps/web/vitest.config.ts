import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // TODO: drop once this package has tests — every new piece of business logic gets unit tests.
    passWithNoTests: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
