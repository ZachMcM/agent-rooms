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
    const source = '/tmp/agent-rooms-1.2.3.tgz'
    installer.runInstall.mockResolvedValue({ version: '1.2.3', changes: [], warnings: [] })
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    addInstallCommand(program, '1.2.3')

    await program.parseAsync(['install', '--yes', '--package', source], { from: 'user' })

    expect(installer.runInstall).toHaveBeenCalledWith({
      version: '1.2.3',
      yes: true,
      dryRun: undefined,
      source,
    })
  })
})
