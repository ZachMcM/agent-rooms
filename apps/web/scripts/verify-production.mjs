import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const entrypoint = fileURLToPath(new URL('../.output/server/index.mjs', import.meta.url))
const port = String(40000 + Math.floor(Math.random() * 10000))
const testHome = await mkdtemp(join(tmpdir(), 'agent-rooms-web-production-'))
const child = spawn(process.execPath, [entrypoint], {
  env: { ...process.env, HOME: testHome, NITRO_HOST: '127.0.0.1', NITRO_PORT: port },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''

try {
  const url = await waitForServer(child)
  const health = await fetch(`${url}/api/health`)

  if (!health.headers.get('content-type')?.startsWith('application/json')) {
    throw new Error('Health endpoint did not return JSON.')
  }

  if (JSON.stringify(await health.json()) !== JSON.stringify({ ok: true })) {
    throw new Error('Health endpoint returned an unexpected response.')
  }

  const rooms = await fetch(`${url}/api/rooms`)

  if (!rooms.ok || JSON.stringify(await rooms.json()) !== JSON.stringify([])) {
    throw new Error('Rooms endpoint did not read from the temporary production database.')
  }

  const root = await fetch(url)
  const html = await root.text()
  const asset = html.match(/\/assets\/[^"']+\.js/)

  if (!root.ok || !html.includes('Agent Rooms') || !asset) {
    throw new Error('Root route did not render the Start application with built assets.')
  }

  if (!(await fetch(`${url}${asset[0]}`)).ok) {
    throw new Error('Built client asset did not load.')
  }
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = once(child, 'exit')
    child.kill('SIGTERM')
    await exited
  }

  await rm(testHome, { recursive: true })
}

function waitForServer(server) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Dashboard server did not start: ${output}`)),
      5000,
    )
    const onOutput = (chunk) => {
      output += chunk.toString()
      const match = output.match(/Listening on:\s*(http:\/\/[^\s]+)/i)

      if (!match) return

      clearTimeout(timeout)
      resolve(match[1])
    }

    server.stdout.on('data', onOutput)
    server.stderr.on('data', onOutput)
    server.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    server.once('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Dashboard server exited with code ${code ?? 'unknown'}: ${output}`))
    })
  })
}
