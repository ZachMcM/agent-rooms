import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist/server',
  format: ['esm'],
  outExtension: () => ({ js: '.mjs' }),
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  dts: false,
  noExternal: [/^@agent-rooms\//],
  external: ['@libsql/client', 'express'],
})
