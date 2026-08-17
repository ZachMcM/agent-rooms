import { spawn } from 'node:child_process'
import { createServer, type Server } from 'node:net'
import { fileURLToPath } from 'node:url'

import type { Command } from 'commander'

import { CliError } from '../errors'

const defaultPort = 61937

export function addDashboardCommand(program: Command): void {
  program
    .command('dashboard')
    .description('Starts the local dashboard.')
    .option('--port <port>')
    .option('--open')
    .exitOverride()
    .action(async (options: { port?: string; open?: boolean }) => {
      const port = parseDashboardPort(options.port ?? process.env.AGENT_ROOMS_PORT)
      await assertDashboardPortAvailable(port)
      const entrypoint = fileURLToPath(
        new URL('../assets/dashboard/server/index.mjs', import.meta.url),
      )
      await runDashboardServer(entrypoint, port, options.open)
    })
}

export function assertDashboardPortAvailable(
  port: number,
  createPortServer: () => Server = createServer,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createPortServer()
    const close = () => server.close((error) => (error ? reject(error) : resolve()))

    server.once('error', (error) => {
      if ('code' in error && error.code === 'EADDRINUSE') {
        reject(new CliError('port_in_use', `Dashboard port ${port} is already in use.`, 1))
        return
      }

      reject(error)
    })
    server.listen(port, '127.0.0.1', close)
  })
}

function runDashboardServer(
  entrypoint: string,
  port: number,
  open: boolean | undefined,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `http://127.0.0.1:${port}`
    const child = spawn(process.execPath, [entrypoint], {
      env: { ...process.env, NITRO_HOST: '127.0.0.1', NITRO_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    let announced = false
    let stopping = false

    const announce = () => {
      if (announced) return

      announced = true
      process.stdout.write(`${url}\n`)
      if (open) openDashboard(url)
    }
    const reportOutput = (chunk: Buffer) => {
      output += chunk.toString()
      if (/listening on|http:\/\//i.test(output)) announce()
    }
    const stop = () => {
      stopping = true
      child.kill('SIGTERM')
    }

    child.stdout.on('data', reportOutput)
    child.stderr.on('data', reportOutput)
    child.once('error', reject)
    child.once('exit', (code) => {
      process.off('SIGINT', stop)
      process.off('SIGTERM', stop)

      if (stopping) {
        resolve()
        return
      }

      if (/EADDRINUSE/.test(output)) {
        reject(new CliError('port_in_use', `Dashboard port ${port} is already in use.`, 1))
        return
      }

      if (code !== 0) {
        reject(new Error(`Dashboard server exited with code ${code ?? 'unknown'}.`))
        return
      }

      resolve()
    })
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}

export function parseDashboardPort(value: string | undefined): number {
  if (value === undefined) {
    return defaultPort
  }

  if (!/^\d+$/.test(value)) {
    throw new CliError('invalid_arguments', 'Dashboard port must be an integer from 1 to 65535.', 2)
  }

  const port = Number(value)

  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new CliError('invalid_arguments', 'Dashboard port must be an integer from 1 to 65535.', 2)
  }

  return port
}

function openDashboard(url: string): void {
  const command = process.platform === 'darwin' ? 'open' : 'xdg-open'
  const child = spawn(command, [url], { stdio: 'ignore' })
  child.once('error', () => {})
  child.unref()
}
