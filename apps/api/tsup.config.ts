import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  dts: false,
  clean: true,
  sourcemap: true,
  noExternal: [/^@agent-comms\//],
  external: ['@libsql/client'],
})
