import { afterEach, describe, expect, it, vi } from 'vitest'

const spinner = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }))
const ora = vi.hoisted(() => vi.fn(() => spinner))

vi.mock('ora', () => ({ default: ora }))

import { CliError } from '../errors'
import {
  assertDashboardPortAvailable,
  createDashboardPresenter,
  parseDashboardPort,
} from './dashboard'

const stdoutWrite = process.stdout.write
const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY')
const stderrTTY = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY')
const noColor = process.env.NO_COLOR
const ci = process.env.CI
const term = process.env.TERM

afterEach(() => {
  process.stdout.write = stdoutWrite
  if (stdoutTTY) Object.defineProperty(process.stdout, 'isTTY', stdoutTTY)
  else delete (process.stdout as { isTTY?: boolean }).isTTY
  if (stderrTTY) Object.defineProperty(process.stderr, 'isTTY', stderrTTY)
  else delete (process.stderr as { isTTY?: boolean }).isTTY
  if (noColor === undefined) delete process.env.NO_COLOR
  else process.env.NO_COLOR = noColor
  if (ci === undefined) delete process.env.CI
  else process.env.CI = ci
  if (term === undefined) delete process.env.TERM
  else process.env.TERM = term
  ora.mockClear()
  spinner.start.mockClear()
  spinner.stop.mockClear()
})

describe('dashboard command', () => {
  it('uses the private dynamic port by default', () => {
    expect(parseDashboardPort(undefined)).toBe(61937)
  })

  it.each(['1', '61937', '65535'])('accepts port %s', (value) => {
    expect(parseDashboardPort(value)).toBe(Number(value))
  })

  it.each(['0', '65536', '-1', '1.5', 'not-a-port'])('rejects port %s', (value) => {
    expect(() => parseDashboardPort(value)).toThrow(CliError)
  })

  it('rejects an occupied loopback port', async () => {
    let onError: ((error: Error & { code?: string }) => void) | undefined
    const server = {
      once(event: string, listener: (error: Error & { code?: string }) => void) {
        if (event === 'error') onError = listener
        return server
      },
      listen() {
        onError?.(Object.assign(new Error('in use'), { code: 'EADDRINUSE' }))
        return server
      },
    }

    await expect(assertDashboardPortAvailable(62437, () => server as never)).rejects.toMatchObject({
      code: 'port_in_use',
    })
  })

  it('presents the running dashboard in an interactive terminal', () => {
    const stdout: string[] = []
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true })
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: true })
    delete process.env.NO_COLOR
    delete process.env.CI
    delete process.env.TERM
    process.stdout.write = ((message: string | Uint8Array) => {
      stdout.push(String(message))
      return true
    }) as typeof process.stdout.write

    const presenter = createDashboardPresenter()
    presenter.start()
    presenter.ready('http://127.0.0.1:61937')

    expect(spinner.start).toHaveBeenCalledWith('Starting Agent Rooms dashboard...')
    expect(spinner.stop).toHaveBeenCalledOnce()
    expect(stdout.join('')).toContain('\u001B[32m✔\u001B[39m')
    expect(stdout.join('')).toContain('Agent Rooms dashboard is running')
    expect(stdout.join('')).toContain('http://127.0.0.1:61937')
    expect(stdout.join('')).toContain('Ctrl-C')
  })

  it.each([
    ['NO_COLOR', () => (process.env.NO_COLOR = '1')],
    ['TERM=dumb', () => (process.env.TERM = 'dumb')],
  ])('keeps the interactive presentation without color for %s', (_name, configure) => {
    const stdout: string[] = []
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true })
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: true })
    delete process.env.NO_COLOR
    delete process.env.CI
    delete process.env.TERM
    configure()
    process.stdout.write = ((message: string | Uint8Array) => {
      stdout.push(String(message))
      return true
    }) as typeof process.stdout.write

    const presenter = createDashboardPresenter()
    presenter.start()
    presenter.ready('http://127.0.0.1:61937')

    expect(ora).toHaveBeenCalledWith(expect.objectContaining({ color: false, isEnabled: true }))
    expect(spinner.start).toHaveBeenCalledWith('Starting Agent Rooms dashboard...')
    expect(stdout.join('')).toContain('Agent Rooms dashboard is running')
    expect(stdout.join('')).toContain('http://127.0.0.1:61937')
    expect(stdout.join('')).toContain('Ctrl-C')
    expect(stdout.join('')).not.toContain('\u001B')
  })

  it('writes only the URL outside an interactive terminal', () => {
    const stdout: string[] = []
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: false })
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: false })
    process.stdout.write = ((message: string | Uint8Array) => {
      stdout.push(String(message))
      return true
    }) as typeof process.stdout.write

    const presenter = createDashboardPresenter()
    presenter.start()
    presenter.ready('http://127.0.0.1:61937')

    expect(stdout).toEqual(['http://127.0.0.1:61937\n'])
    expect(ora).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }))
    expect(spinner.stop).toHaveBeenCalledOnce()
  })

  it('writes only the URL in CI even with TTY streams', () => {
    const stdout: string[] = []
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true })
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: true })
    process.env.CI = 'true'
    process.stdout.write = ((message: string | Uint8Array) => {
      stdout.push(String(message))
      return true
    }) as typeof process.stdout.write

    const presenter = createDashboardPresenter()
    presenter.start()
    presenter.ready('http://127.0.0.1:61937')

    expect(stdout).toEqual(['http://127.0.0.1:61937\n'])
    expect(ora).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }))
    expect(spinner.stop).toHaveBeenCalledOnce()
  })
})
