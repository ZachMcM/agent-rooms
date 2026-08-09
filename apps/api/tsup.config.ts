import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cloud.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  dts: false,
  clean: true,
  sourcemap: true,
  noExternal: [/^@agent-rooms\//],
  external: ['@libsql/client'],
})
