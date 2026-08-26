import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { addInstallCommand } from './install'

const installer = vi.hoisted(() => ({
  runInstall: vi.fn(),
  runUninstall: vi.fn(),
}))

vi.mock('../installer/transaction', () => installer)

afterEach(() => {
  vi.restoreAllMocks()
  installer.runInstall.mockReset()
  installer.runUninstall.mockReset()
})

describe('install command', () => {
  it('passes a local package path to the installer source', async () => {
    const program = new Command()
    const source = '/tmp/coordrooms-1.2.3.tgz'
    installer.runInstall.mockResolvedValue({ version: '1.2.3', changes: [], warnings: [] })
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    addInstallCommand(program, '1.2.3')

    await program.parseAsync(['install', '--yes', '--package', source], { from: 'user' })

    expect(installer.runInstall).toHaveBeenCalledWith(
      expect.objectContaining({ version: '1.2.3', yes: true, dryRun: undefined, source }),
    )
  })

  it('writes concise plain output outside a TTY', async () => {
    const program = new Command()
    const output: string[] = []
    installer.runInstall.mockResolvedValue({
      version: '1.2.3',
      changes: [{ action: 'add PATH block', path: '/tmp/home/.zshrc' }],
      warnings: [],
    })
    vi.spyOn(process.stdout, 'write').mockImplementation((message) => {
      output.push(String(message))
      return true
    })
    addInstallCommand(program, '1.2.3')

    await program.parseAsync(['install', '--yes'], { from: 'user' })

    expect(output.join('')).toBe(
      "✔ Installed CoordRooms 1.2.3.\n✔ Updated /tmp/home/.zshrc.\nRun source '/tmp/home/.zshrc' to use coordrooms in this terminal, or open a new terminal.\n",
    )
  })

  it('preserves the success envelope with --json', async () => {
    const program = new Command()
    const output: string[] = []
    const errors: string[] = []
    const result = { version: '1.2.3', changes: [], warnings: [] }
    installer.runInstall.mockResolvedValue(result)
    vi.spyOn(process.stdout, 'write').mockImplementation((message) => {
      output.push(String(message))
      return true
    })
    vi.spyOn(process.stderr, 'write').mockImplementation((message) => {
      errors.push(String(message))
      return true
    })
    addInstallCommand(program, '1.2.3')

    await program.parseAsync(['install', '--yes', '--json'], { from: 'user' })

    expect(output).toEqual([`{"ok":true,"data":${JSON.stringify(result)}}\n`])
    expect(errors).toEqual([])
    expect(output.join('')).not.toContain('\u001B')
  })
})
