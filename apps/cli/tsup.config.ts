import { defineConfig } from 'tsup'

// Workspace deps live in devDependencies — in dependencies they get rewritten to a public range
// at pack time and fail to resolve on the registry. noExternal inlines them into the bundle.
// @libsql/client has native bindings, so it stays a real dependency and is marked external.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  dts: false,
  noExternal: [/^@agent-rooms\//, /^@hono\//, 'hono'],
  external: ['@libsql/client'],
  banner: { js: '#!/usr/bin/env node' },
})
