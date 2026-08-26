import { afterEach, describe, expect, it, vi } from 'vitest'

const spinner = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }))
const ora = vi.hoisted(() => vi.fn(() => spinner))

vi.mock('ora', () => ({ default: ora }))

import { createInstallerPresenter } from './presenter'

const stdoutWrite = process.stdout.write
const stderrWrite = process.stderr.write
const stdoutTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY')
const stderrTTY = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY')
const noColor = process.env.NO_COLOR
const ci = process.env.CI
const term = process.env.TERM

afterEach(() => {
  process.stdout.write = stdoutWrite
  process.stderr.write = stderrWrite
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

describe('installer presenter', () => {
  it('uses deterministic plain output outside a TTY and with NO_COLOR', () => {
    const stdout: string[] = []
    const stderr: string[] = []
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: false })
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: false })
    process.env.NO_COLOR = '1'
    process.stdout.write = ((message: string | Uint8Array) => {
      stdout.push(String(message))
      return true
    }) as typeof process.stdout.write
    process.stderr.write = ((message: string | Uint8Array) => {
      stderr.push(String(message))
      return true
    }) as typeof process.stderr.write

    createInstallerPresenter().install(
      { version: '1.2.3', changes: [], warnings: ['Add /tmp/bin to PATH manually.'] },
      false,
    )

    expect(stdout).toEqual([
      '✔ Installed CoordRooms 1.2.3.\n',
      'CoordRooms is ready to use.\n',
      'Completed with 1 warning.\n',
    ])
    expect(stderr).toEqual(['Warning: Add /tmp/bin to PATH manually.\n'])
    expect(`${stdout.join('')}${stderr.join('')}`).not.toContain('\u001B')
  })

  it('enables the colored Braille spinner only in an interactive terminal', () => {
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

    const presenter = createInstallerPresenter()
    presenter.start('Installing CoordRooms...')
    presenter.install({ version: '1.2.3', changes: [], warnings: [] }, false)

    expect(ora).toHaveBeenCalledWith(
      expect.objectContaining({
        color: expect.any(String),
        discardStdin: false,
        isEnabled: true,
        spinner: 'dots',
      }),
    )
    expect(spinner.start).toHaveBeenCalledWith('Installing CoordRooms...')
    expect(stdout.join('')).toContain('\u001B[32m✔\u001B[39m')

    ora.mockClear()
    process.env.CI = 'true'
    createInstallerPresenter().start('Installing CoordRooms...')
    expect(ora).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }))

    ora.mockClear()
    delete process.env.CI
    process.env.NO_COLOR = '1'
    createInstallerPresenter().start('Installing CoordRooms...')
    expect(ora).toHaveBeenCalledWith(expect.objectContaining({ color: false, isEnabled: true }))
  })

  it.each([
    ['NO_COLOR', () => (process.env.NO_COLOR = '1')],
    ['TERM=dumb', () => (process.env.TERM = 'dumb')],
  ])('starts an uncolored spinner for %s', (_name, configure) => {
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true })
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: true })
    delete process.env.NO_COLOR
    delete process.env.CI
    delete process.env.TERM
    configure()

    createInstallerPresenter().start('Installing CoordRooms...')

    expect(ora).toHaveBeenCalledWith(expect.objectContaining({ color: false, isEnabled: true }))
  })

  it('lists dry-run changes and uninstall data handling', () => {
    const stdout: string[] = []
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: false })
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: false })
    process.stdout.write = ((message: string | Uint8Array) => {
      stdout.push(String(message))
      return true
    }) as typeof process.stdout.write

    const presenter = createInstallerPresenter()
    presenter.install(
      {
        version: '1.2.3',
        changes: [{ action: 'install verified runtime', path: '/tmp/runtime/1.2.3' }],
        warnings: [],
      },
      true,
    )
    presenter.uninstall(
      {
        changes: [{ action: 'remove runtime and manifest', path: '/tmp/coordrooms' }],
        warnings: [],
      },
      false,
    )

    expect(stdout).toEqual([
      '✔ Previewed 1 changes; no files were modified.\n',
      '  - install verified runtime: /tmp/runtime/1.2.3\n',
      '✔ Removed 1 managed changes.\n',
      'Kept CoordRooms data.\n',
      'To remove it later, run coordrooms uninstall --yes --purge-data.\n',
    ])
  })

  it('asks users to trust Codex hooks only after patching them', () => {
    const stdout: string[] = []
    Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: false })
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: false })
    process.stdout.write = ((message: string | Uint8Array) => {
      stdout.push(String(message))
      return true
    }) as typeof process.stdout.write

    const presenter = createInstallerPresenter()
    presenter.install(
      {
        version: '1.2.3',
        changes: [{ action: 'patch codex hooks', path: '/tmp/.codex/hooks.json' }],
        warnings: [],
      },
      false,
    )

    expect(stdout).toContain(
      "Codex requires you to review and trust the CoordRooms hooks before they run. In the Codex CLI, run /hooks; in Codex Desktop, open Codex's hook review.\n",
    )

    stdout.length = 0
    presenter.install(
      {
        version: '1.2.3',
        changes: [{ action: 'install codex skill', path: '/tmp/.agents/skills/coordrooms' }],
        warnings: [],
      },
      false,
    )

    expect(stdout.join('')).not.toContain('review and trust the CoordRooms hooks')

    stdout.length = 0
    presenter.install(
      {
        version: '1.2.3',
        changes: [{ action: 'patch codex hooks', path: '/tmp/.codex/hooks.json' }],
        warnings: [],
      },
      true,
    )

    expect(stdout.join('')).not.toContain('review and trust the CoordRooms hooks')
  })
})
