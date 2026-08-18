import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: { external: ['@libsql/client'] },
  plugins: [tailwindcss(), tanstackStart(), viteReact(), nitro({ preset: 'node-server' })],
})
