import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { PassThrough } from 'node:stream'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { providerHookConfig } from '../commands/hooks'
import { parseJsonc } from './jsonc'
import { detectExistingClientRoots } from './preflight'
import { runInstall, runUninstall } from './transaction'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('installer transaction', () => {
  it('previews without staging or writing', async () => {
    const home = await temporaryHome()
    await mkdir(join(home, '.codex'))
    const result = await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: join(home, '.codex') }],
      shell: '/bin/zsh',
      dryRun: true,
      yes: true,
    })

    expect(result.changes.map((change) => change.action)).toContain('patch codex hooks')
    expect(result.changes).toContainEqual({
      path: join(home, '.agents', 'skills', 'coordrooms', 'SKILL.md'),
      action: 'install codex skill',
    })
    await expect(lstat(join(home, '.coordrooms'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('uses exact registry npm argv, installs owned integrations, and uninstalls them', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    await writeFile(
      join(codex, 'hooks.json'),
      '{"hooks":{"UserPromptSubmit":[{"command":"keep"}]}}\n',
    )
    await writeFile(join(home, '.zshrc'), 'export EDITOR=vim\n')
    const { calls, spawn } = packageSpawn('1.2.3')

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '/bin/zsh',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
      now: () => new Date('2026-08-16T00:00:00.000Z'),
    })

    expect(calls[0]).toEqual(['npm', '--version'])
    expect(calls[1]).toEqual([
      'npm',
      'install',
      '--prefix',
      join(home, '.coordrooms', '.stage-1.2.3'),
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      'coordrooms@1.2.3',
    ])
    expect(await readFile(join(codex, 'hooks.json'), 'utf8')).toContain('keep')
    expect(await readFile(join(codex, 'hooks.json'), 'utf8')).toContain('consume-new-messages')
    expect(await readFile(join(codex, 'config.toml'), 'utf8')).toContain('[mcp_servers.coordrooms]')
    expect(await readFile(join(codex, 'config.toml'), 'utf8')).toContain('args = ["mcp"]')
    const skill = join(home, '.agents', 'skills', 'coordrooms', 'SKILL.md')
    await expect(readFile(skill, 'utf8')).resolves.toBe('skill')
    await expect(lstat(join(codex, 'skills'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(home, '.zshrc'), 'utf8')).toContain('>>> coordrooms >>>')
    const manifest = JSON.parse(
      await readFile(join(home, '.coordrooms', 'install-state.json'), 'utf8'),
    ) as {
      previous?: string
      backups?: string[]
      skills: Array<{ path: string }>
    }
    expect(manifest.previous).toBeUndefined()
    expect(manifest.backups).toBeUndefined()
    expect(manifest.skills).toEqual([{ path: skill, hash: expect.any(String) }])
    await expect(lstat(join(home, '.coordrooms', 'backups'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect((await lstat(join(home, '.coordrooms', 'current'))).isSymbolicLink()).toBe(true)
    expect((await lstat(join(home, '.coordrooms', 'db.sqlite'))).mode & 0o777).toBe(0o600)
    expect(calls.some((call) => call.join(' ').includes('SELECT 1'))).toBe(true)
    expect(
      (
        await readdir(join(home, '.coordrooms', 'runtime', '1.2.3', 'node_modules', 'coordrooms'))
      ).some((name) => name.startsWith('.verify-libsql-')),
    ).toBe(false)
    await expect(
      readFile(
        join(
          home,
          '.coordrooms',
          'runtime',
          '1.2.3',
          'node_modules',
          'coordrooms',
          'assets',
          'dashboard',
          'server',
          'index.mjs',
        ),
        'utf8',
      ),
    ).resolves.toBe('export default {}')
    await expect(
      readFile(
        join(
          home,
          '.coordrooms',
          'runtime',
          '1.2.3',
          'node_modules',
          'coordrooms',
          'assets',
          'dashboard',
          'public',
          'assets',
          'app.js',
        ),
        'utf8',
      ),
    ).resolves.toBe('export default {}')

    await runUninstall({
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '/bin/zsh',
      yes: true,
    })

    expect(await readFile(join(codex, 'hooks.json'), 'utf8')).toContain('keep')
    expect(await readFile(join(codex, 'hooks.json'), 'utf8')).not.toContain('consume-new-messages')
    expect(await readFile(join(codex, 'config.toml'), 'utf8')).not.toContain(
      '[mcp_servers.coordrooms]',
    )
    expect(await readFile(join(home, '.zshrc'), 'utf8')).not.toContain('>>> coordrooms >>>')
    await expect(lstat(skill)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(home, '.agents', 'skills'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(home, '.coordrooms', 'db.sqlite'), 'utf8')).resolves.toBe('database')
  })

  it('installs and uninstalls the OpenCode plugin, MCP, and skill', async () => {
    const home = await temporaryHome()
    const opencode = join(home, '.config', 'opencode')
    const plugin = join(opencode, 'plugins', 'coordrooms.ts')
    const skill = join(opencode, 'skills', 'coordrooms', 'SKILL.md')
    await mkdir(opencode, { recursive: true })
    await writeFile(
      join(opencode, 'opencode.json'),
      '{\n  "theme": "dark",\n  "mcp": { "other": { "type": "remote", "url": "https://x" } },\n}\n',
    )
    const { spawn } = packageSpawn('1.2.3')

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'opencode', path: opencode }],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    await expect(readFile(plugin, 'utf8')).resolves.toBe('plugin')
    await expect(readFile(skill, 'utf8')).resolves.toBe('skill')
    const source = await readFile(join(opencode, 'opencode.json'), 'utf8')
    expect(source).toContain('"theme": "dark"')
    expect(source).toContain('"other"')
    const config = parseJsonc(source) as {
      mcp: Record<string, { type: string; command: string[]; enabled: boolean }>
    }
    expect(config.mcp['coordrooms']).toEqual({
      type: 'local',
      command: [join(home, '.coordrooms', 'bin', 'coordrooms'), 'mcp'],
      enabled: true,
    })
    const manifest = JSON.parse(
      await readFile(join(home, '.coordrooms', 'install-state.json'), 'utf8'),
    ) as {
      roots: Array<{ client: string; config: string }>
      plugins: Array<{ path: string }>
    }
    expect(manifest.roots).toEqual([
      { client: 'opencode', path: opencode, config: join(opencode, 'opencode.json') },
    ])
    expect(manifest.plugins.map(({ path }) => path)).toEqual([plugin])

    await runUninstall({ homeDirectory: home, yes: true })

    await expect(lstat(plugin)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(opencode, 'plugins'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(skill)).rejects.toMatchObject({ code: 'ENOENT' })
    const uninstalled = await readFile(join(opencode, 'opencode.json'), 'utf8')
    expect(uninstalled).toContain('"theme": "dark"')
    expect(uninstalled).toContain('"other"')
    expect(uninstalled).not.toContain('coordrooms')
  })

  it('refuses to overwrite a modified OpenCode plugin before integration mutation', async () => {
    const home = await temporaryHome()
    const opencode = join(home, '.config', 'opencode')
    const plugin = join(opencode, 'plugins', 'coordrooms.ts')
    await mkdir(dirname(plugin), { recursive: true })
    await writeFile(plugin, 'user plugin')
    const { calls, spawn } = packageSpawn('1.2.3')
    let migrated = false

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [{ client: 'opencode', path: opencode }],
        shell: '',
        yes: true,
        spawn,
        migrate: async () => {
          migrated = true
        },
      }),
    ).rejects.toThrow(`Refusing to overwrite modified plugin: ${plugin}.`)

    expect(migrated).toBe(false)
    await expect(readFile(plugin, 'utf8')).resolves.toBe('user plugin')
    await expect(lstat(join(home, '.coordrooms', 'current'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect(calls.filter((call) => call[0] === 'npm' && call[1] === 'install')).toHaveLength(1)
  })

  it('overwrites an installer-owned OpenCode plugin on update', async () => {
    const home = await temporaryHome()
    const opencode = join(home, '.config', 'opencode')
    const plugin = join(opencode, 'plugins', 'coordrooms.ts')
    await mkdir(opencode, { recursive: true })

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'opencode', path: opencode }],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    await expect(readFile(plugin, 'utf8')).resolves.toBe('plugin')

    await runInstall({
      version: '1.2.4',
      homeDirectory: home,
      roots: [{ client: 'opencode', path: opencode }],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.4', {
        mutate: async (root) =>
          writeFile(join(root, 'assets', 'coordrooms', 'opencode-plugin.ts'), 'plugin-v2'),
      }).spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    await expect(readFile(plugin, 'utf8')).resolves.toBe('plugin-v2')
  })

  it('refuses to overwrite a user-modified OpenCode plugin on update', async () => {
    const home = await temporaryHome()
    const opencode = join(home, '.config', 'opencode')
    const plugin = join(opencode, 'plugins', 'coordrooms.ts')
    await mkdir(opencode, { recursive: true })

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'opencode', path: opencode }],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    await writeFile(plugin, 'user plugin')

    await expect(
      runInstall({
        version: '1.2.4',
        homeDirectory: home,
        roots: [{ client: 'opencode', path: opencode }],
        shell: '',
        yes: true,
        spawn: packageSpawn('1.2.4', {
          mutate: async (root) =>
            writeFile(join(root, 'assets', 'coordrooms', 'opencode-plugin.ts'), 'plugin-v2'),
        }).spawn,
        migrate: async (databasePath) => writeFile(databasePath, 'database'),
      }),
    ).rejects.toThrow(`Refusing to overwrite modified plugin: ${plugin}.`)

    await expect(readFile(plugin, 'utf8')).resolves.toBe('user plugin')
  })

  it('keeps a Codex skill under HOME when CODEX_HOME is overridden', async () => {
    const home = await temporaryHome()
    const codex = join(home, 'custom-codex')
    await mkdir(codex)
    const roots = await detectExistingClientRoots({ CODEX_HOME: codex }, home)

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots,
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    await expect(readFile(join(codex, 'hooks.json'), 'utf8')).resolves.toContain(
      'consume-new-messages',
    )
    await expect(
      readFile(join(home, '.agents', 'skills', 'coordrooms', 'SKILL.md'), 'utf8'),
    ).resolves.toBe('skill')
    await expect(lstat(join(codex, 'skills'))).rejects.toMatchObject({ code: 'ENOENT' })

    const manifest = JSON.parse(
      await readFile(join(home, '.coordrooms', 'install-state.json'), 'utf8'),
    ) as {
      roots: Array<{ client: string; path: string; config: string }>
      skills: Array<{ path: string }>
    }
    expect(manifest.roots).toEqual([
      { client: 'codex', path: codex, config: join(codex, 'hooks.json') },
    ])
    expect(manifest.skills.map(({ path }) => path)).toEqual([
      join(home, '.agents', 'skills', 'coordrooms', 'SKILL.md'),
    ])
  })

  it('uses a validated local tarball as the final npm install argument', async () => {
    const home = await temporaryHome()
    const tarball = join(home, 'coordrooms-1.2.3.tgz')
    const stage = join(home, '.coordrooms', '.stage-1.2.3')
    const snapshot = join(stage, '.coordrooms-package.tgz')
    await writeFile(tarball, 'package')
    const { calls, spawn } = packageSpawn('1.2.3')

    await runInstall({
      version: '1.2.3',
      source: tarball,
      homeDirectory: home,
      roots: [],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    expect(calls[1]).toEqual([
      'npm',
      'install',
      '--prefix',
      stage,
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      snapshot,
    ])
    await expect(
      lstat(join(home, '.coordrooms', 'runtime', '1.2.3', '.coordrooms-package.tgz')),
    ).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([
    ['a relative path', 'coordrooms-1.2.3.tgz'],
    ['a URL', 'https://registry.example/coordrooms-1.2.3.tgz'],
    ['a package spec', 'coordrooms@1.2.3'],
  ])('rejects %s before mutation', async (_name, source) => {
    const home = await temporaryHome()
    const calls: string[] = []

    await expect(
      runInstall({
        version: '1.2.3',
        source,
        homeDirectory: home,
        roots: [],
        yes: true,
        spawn: async (command) => {
          calls.push(command)
        },
        migrate: async () => {
          calls.push('migrate')
        },
      }),
    ).rejects.toThrow('Local package must be a normalized absolute path')
    expect(calls).toEqual([])
    await expect(lstat(join(home, '.coordrooms'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects a non-normalized absolute package path before mutation', async () => {
    const home = await temporaryHome()
    const source = `${home}/nested/../coordrooms-1.2.3.tgz`
    await writeFile(join(home, 'coordrooms-1.2.3.tgz'), 'package')

    await expect(
      runInstall({ version: '1.2.3', source, homeDirectory: home, roots: [], yes: true }),
    ).rejects.toThrow('Local package must be a normalized absolute path')
    await expect(lstat(join(home, '.coordrooms'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects a local package replaced after preflight validation', async () => {
    const home = await temporaryHome()
    const source = join(home, 'coordrooms-1.2.3.tgz')
    const replacement = join(home, 'replacement.tgz')
    await writeFile(source, 'original package')
    await writeFile(replacement, 'replacement package')
    const { calls, spawn } = packageSpawn('1.2.3')

    await expect(
      runInstall({
        version: '1.2.3',
        source,
        homeDirectory: home,
        roots: [],
        shell: '',
        isTTY: true,
        prompt: async () => {
          await rename(replacement, source)
          return true
        },
        spawn,
      }),
    ).rejects.toThrow(`Local package changed after validation: ${source}`)
    expect(calls.filter((call) => call[0] === 'npm' && call[1] === 'install')).toHaveLength(0)
    await expect(lstat(join(home, '.coordrooms', '.stage-1.2.3'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects a local package with another extension before mutation', async () => {
    const home = await temporaryHome()
    const source = join(home, 'coordrooms-1.2.3.tar.gz')
    await writeFile(source, 'package')

    await expect(
      runInstall({ version: '1.2.3', source, homeDirectory: home, roots: [], yes: true }),
    ).rejects.toThrow('Local package must be a .tgz tarball')
    await expect(lstat(join(home, '.coordrooms'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects local package directories and symlinks before mutation', async () => {
    const home = await temporaryHome()
    const directory = join(home, 'directory.tgz')
    const target = join(home, 'target.tgz')
    const link = join(home, 'link.tgz')
    await mkdir(directory)
    await writeFile(target, 'package')
    await symlink(target, link)

    await expect(
      runInstall({
        version: '1.2.3',
        source: directory,
        homeDirectory: home,
        roots: [],
        yes: true,
      }),
    ).rejects.toThrow('regular file')
    await expect(
      runInstall({
        version: '1.2.3',
        source: link,
        homeDirectory: home,
        roots: [],
        yes: true,
      }),
    ).rejects.toThrow('symbolic link')
    await expect(lstat(join(home, '.coordrooms'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('refuses to reuse an existing same-version runtime for a local package', async () => {
    const home = await temporaryHome()
    const tarball = join(home, 'coordrooms-1.2.3.tgz')
    const runtime = join(home, '.coordrooms', 'runtime', '1.2.3')
    await writeFile(tarball, 'package')
    await mkdir(runtime, { recursive: true })
    const calls: string[] = []

    await expect(
      runInstall({
        version: '1.2.3',
        source: tarball,
        homeDirectory: home,
        roots: [],
        yes: true,
        spawn: async (command) => {
          calls.push(command)
        },
        migrate: async () => {
          calls.push('migrate')
        },
      }),
    ).rejects.toThrow(
      'Local package install cannot reuse existing runtime 1.2.3. Run coordrooms uninstall and retry.',
    )
    expect(calls).toEqual([])
  })

  it('refuses a local runtime destination created during staging', async () => {
    const home = await temporaryHome()
    const tarball = join(home, 'coordrooms-1.2.3.tgz')
    const runtime = join(home, '.coordrooms', 'runtime', '1.2.3')
    await writeFile(tarball, 'package')
    const packageProcess = packageSpawn('1.2.3')

    await expect(
      runInstall({
        version: '1.2.3',
        source: tarball,
        homeDirectory: home,
        roots: [],
        shell: '',
        yes: true,
        spawn: async (command, args, options) => {
          const result = await packageProcess.spawn(command, args, options)
          if (command === 'npm' && args[0] === 'install') {
            await mkdir(runtime, { recursive: true })
          }
          return result
        },
        migrate: async (databasePath) => writeFile(databasePath, 'database'),
      }),
    ).rejects.toThrow(`Refusing to replace existing runtime path: ${runtime}`)

    expect((await lstat(runtime)).isDirectory()).toBe(true)
    await expect(readdir(runtime)).resolves.toEqual([])
    await expect(lstat(join(home, '.coordrooms', 'current'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(lstat(join(home, '.coordrooms', '.stage-1.2.3'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('records only inserted hooks and preserves an identical preexisting hook on uninstall', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    const existing = (
      providerHookConfig(join(home, '.coordrooms', 'bin', 'coordrooms')) as {
        codex: { hooks: { UserPromptSubmit: unknown[] } }
      }
    ).codex.hooks.UserPromptSubmit[0]
    await writeFile(
      join(codex, 'hooks.json'),
      JSON.stringify({ hooks: { UserPromptSubmit: [existing] } }),
    )
    const { spawn } = packageSpawn('1.2.3')

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    const manifest = JSON.parse(
      await readFile(join(home, '.coordrooms', 'install-state.json'), 'utf8'),
    ) as { hooks: Array<{ event: string }> }
    expect(manifest.hooks.some((hook) => hook.event === 'UserPromptSubmit')).toBe(false)

    await runUninstall({
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '',
      yes: true,
    })

    const hooks = JSON.parse(await readFile(join(codex, 'hooks.json'), 'utf8')) as {
      hooks: { UserPromptSubmit: unknown[] }
    }
    expect(hooks.hooks.UserPromptSubmit).toEqual([existing])
  })

  it('preserves duplicate preexisting hooks without claiming either one', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    const existing = (
      providerHookConfig(join(home, '.coordrooms', 'bin', 'coordrooms')) as {
        codex: { hooks: { UserPromptSubmit: unknown[] } }
      }
    ).codex.hooks.UserPromptSubmit[0]
    await writeFile(
      join(codex, 'hooks.json'),
      JSON.stringify({ hooks: { UserPromptSubmit: [existing, existing] } }),
    )
    const { spawn } = packageSpawn('1.2.3')

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    const manifest = JSON.parse(
      await readFile(join(home, '.coordrooms', 'install-state.json'), 'utf8'),
    ) as { hooks: Array<{ event: string }> }
    const hooks = JSON.parse(await readFile(join(codex, 'hooks.json'), 'utf8')) as {
      hooks: { UserPromptSubmit: unknown[] }
    }
    expect(manifest.hooks.some((hook) => hook.event === 'UserPromptSubmit')).toBe(false)
    expect(hooks.hooks.UserPromptSubmit).toEqual([existing, existing])
  })

  it('removes only the repaired owned duplicate hook', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    const { spawn } = packageSpawn('1.2.3')
    const install = {
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex' as const, path: codex }],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath: string) => writeFile(databasePath, 'database'),
    }

    await runInstall(install)
    const owned = (
      providerHookConfig(join(home, '.coordrooms', 'bin', 'coordrooms')) as {
        codex: { hooks: { UserPromptSubmit: unknown[] } }
      }
    ).codex.hooks.UserPromptSubmit[0]
    await writeFile(
      join(codex, 'hooks.json'),
      `{\n  "hooks": {\n    "UserPromptSubmit": [\n      // user-owned duplicate\n      ${JSON.stringify(owned)},\n      ${JSON.stringify(owned)}\n    ]\n  }\n}\n`,
    )

    await runInstall(install)
    await runUninstall({ homeDirectory: home, yes: true })

    const hooks = await readFile(join(codex, 'hooks.json'), 'utf8')
    expect(hooks).toContain('// user-owned duplicate')
    expect(
      (parseJsonc(hooks) as { hooks: { UserPromptSubmit: unknown[] } }).hooks.UserPromptSubmit,
    ).toEqual([owned])
  })

  it('preserves retained source inside a touched hook event array', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    const retained =
      '// retain this exact entry\n      { "command": "keep", "nested": ["format",] }'
    await mkdir(codex)
    await writeFile(
      join(codex, 'hooks.json'),
      `{\n  "hooks": {\n    "UserPromptSubmit": [\n      ${retained},\n    ],\n  },\n}\n`,
    )
    const { spawn } = packageSpawn('1.2.3')

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    await runUninstall({ homeDirectory: home, yes: true })

    const hooks = await readFile(join(codex, 'hooks.json'), 'utf8')
    expect(hooks).toContain(retained)
    expect(hooks).not.toContain('consume-new-messages')
  })

  it('retains hook ownership through a same-version repair', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    await writeFile(
      join(codex, 'hooks.json'),
      '{\n  "hooks": {\n    // keep this hook\n    "UserPromptSubmit": [{"command":"keep"}],\n    "Unknown": [{"command":"leave"}]\n  }\n}\n',
    )
    const { spawn } = packageSpawn('1.2.3')
    const install = {
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex' as const, path: codex }],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath: string) => writeFile(databasePath, 'database'),
    }

    await runInstall(install)
    await runInstall(install)
    await runUninstall({ homeDirectory: home, yes: true })

    const hooks = await readFile(join(codex, 'hooks.json'), 'utf8')
    expect(hooks).toContain('// keep this hook')
    expect(hooks).toContain('"keep"')
    expect(hooks).toContain('"Unknown"')
    expect(hooks).not.toContain('consume-new-messages')
  })

  it('patches Claude and Cursor MCP configs without disturbing JSONC content', async () => {
    const home = await temporaryHome()
    const claude = join(home, '.claude')
    const cursor = join(home, '.cursor')
    await mkdir(claude)
    await mkdir(cursor)
    await writeFile(join(home, '.claude.json'), '{\n  // keep this\n  "other": true,\n}\n')
    await writeFile(join(cursor, 'mcp.json'), '{\n  // cursor config\n  "other": true,\n}\n')
    const roots = [
      { client: 'claude' as const, path: claude },
      { client: 'cursor' as const, path: cursor },
    ]

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots,
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    for (const path of [join(home, '.claude.json'), join(cursor, 'mcp.json')]) {
      const source = await readFile(path, 'utf8')
      expect(source).toContain('"other": true')
      expect(source).toContain('coordrooms')
    }

    await runUninstall({ homeDirectory: home, yes: true })
    await expect(readFile(join(home, '.claude.json'), 'utf8')).resolves.not.toContain('coordrooms')
    await expect(readFile(join(cursor, 'mcp.json'), 'utf8')).resolves.not.toContain('coordrooms')
  })

  it('preserves commented Codex TOML and leaves preexisting MCP descriptors alone', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    const bin = join(home, '.coordrooms', 'bin', 'coordrooms')
    await mkdir(codex)
    await writeFile(
      join(codex, 'config.toml'),
      `# keep this comment\nmodel = "gpt-5"\n\n[mcp_servers.coordrooms]\ncommand = ${JSON.stringify(bin)}\nargs = ["mcp"]\n`,
    )

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    const manifest = JSON.parse(
      await readFile(join(home, '.coordrooms', 'install-state.json'), 'utf8'),
    ) as { mcps: unknown[] }
    expect(manifest.mcps).toEqual([])

    await runUninstall({ homeDirectory: home, yes: true })
    const config = await readFile(join(codex, 'config.toml'), 'utf8')
    expect(config).toContain('# keep this comment')
    expect(config).toContain('[mcp_servers.coordrooms]')
  })

  it('rejects conflicting MCP descriptors before install mutations', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    await writeFile(
      join(codex, 'config.toml'),
      '[mcp_servers.coordrooms]\ncommand = "/other/coordrooms"\nargs = ["mcp"]\n',
    )

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [{ client: 'codex', path: codex }],
        shell: '',
        yes: true,
        spawn: packageSpawn('1.2.3').spawn,
        migrate: async (databasePath) => writeFile(databasePath, 'database'),
      }),
    ).rejects.toThrow('Refusing to overwrite existing CoordRooms MCP server')
    await expect(lstat(join(home, '.coordrooms'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(readFile(join(codex, 'hooks.json'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('preserves a modified owned MCP descriptor during uninstall', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    await writeFile(
      join(codex, 'config.toml'),
      '[mcp_servers.coordrooms]\ncommand = "/user/coordrooms"\nargs = ["mcp"]\n',
    )

    const result = await runUninstall({ homeDirectory: home, yes: true })
    expect(result.warnings).toContain(
      `Preserved modified MCP server: ${join(codex, 'config.toml')}`,
    )
    await expect(readFile(join(codex, 'config.toml'), 'utf8')).resolves.toContain(
      '/user/coordrooms',
    )
  })

  it('rolls back newly created config, skill, and profile files after a late failure', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    const { spawn } = packageSpawn('1.2.3')

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [{ client: 'codex', path: codex }],
        shell: '/bin/zsh',
        yes: true,
        spawn,
        migrate: async (databasePath) => writeFile(databasePath, 'database'),
        now: () => {
          throw new Error('clock failed')
        },
      }),
    ).rejects.toThrow('configuration was restored')

    for (const path of [
      join(codex, 'hooks.json'),
      join(codex, 'config.toml'),
      join(home, '.agents', 'skills', 'coordrooms', 'SKILL.md'),
      join(home, '.zshrc'),
    ]) {
      await expect(lstat(path)).rejects.toMatchObject({ code: 'ENOENT' })
    }
    await expect(lstat(join(home, '.coordrooms', 'current'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(lstat(join(home, '.coordrooms', 'bin', 'coordrooms'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('retains rollback runtimes when a post-activation manifest write fails', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    await runInstall({
      version: '1.2.4',
      homeDirectory: home,
      roots: [],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.4').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    const currentLink = join(home, '.coordrooms', 'current')
    const binLink = join(home, '.coordrooms', 'bin', 'coordrooms')
    const currentBefore = await readlink(currentLink)
    const binBefore = await readlink(binLink)

    await expect(
      runInstall({
        version: '1.2.5',
        homeDirectory: home,
        roots: [{ client: 'codex', path: codex }],
        shell: '',
        yes: true,
        spawn: packageSpawn('1.2.5').spawn,
        migrate: async (databasePath) => writeFile(databasePath, 'database'),
        now: () => {
          throw new Error('clock failed')
        },
      }),
    ).rejects.toThrow('configuration was restored')

    await expect(lstat(join(home, '.coordrooms', 'runtime', '1.2.3'))).resolves.toBeDefined()
    await expect(lstat(join(home, '.coordrooms', 'runtime', '1.2.4'))).resolves.toBeDefined()
    await expect(lstat(join(home, '.coordrooms', 'runtime', '1.2.5'))).resolves.toBeDefined()
    expect(await readlink(currentLink)).toBe(currentBefore)
    expect(await readlink(binLink)).toBe(binBefore)
    const manifest = JSON.parse(
      await readFile(join(home, '.coordrooms', 'install-state.json'), 'utf8'),
    ) as { current: string }
    expect(manifest.current).toBe('1.2.4')
  })

  it('reuses a verified same-version runtime without reinstalling it', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    const { calls, spawn } = packageSpawn('1.2.3')
    const install = {
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex' as const, path: codex }],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath: string) => writeFile(databasePath, 'database'),
    }

    await runInstall(install)
    const runtime = join(home, '.coordrooms', 'runtime', '1.2.3')
    const runtimeInode = (await lstat(runtime, { bigint: true })).ino
    await runInstall(install)

    expect(calls.filter((call) => call[0] === 'npm' && call[1] === 'install')).toHaveLength(1)
    expect(calls.filter((call) => call[0] === 'node' && call.includes('--eval'))).toHaveLength(2)
    expect(calls.filter((call) => call[0] === 'node' && call.at(-1) === '--version')).toHaveLength(
      2,
    )
    expect((await lstat(runtime, { bigint: true })).ino).toBe(runtimeInode)
    await expect(lstat(join(home, '.coordrooms', 'previous'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('refuses a corrupt existing same-version runtime with a repair instruction', async () => {
    const home = await temporaryHome()
    const installRoot = join(home, '.coordrooms')
    const runtime = join(installRoot, 'runtime', '1.2.3')
    await mkdir(runtime, { recursive: true })
    await writeFile(join(runtime, 'corrupt'), 'runtime')
    await writeFile(
      join(installRoot, 'install-state.json'),
      JSON.stringify({
        version: 1,
        package: { name: 'coordrooms', version: '1.2.3' },
        installedAt: '2026-08-16T00:00:00.000Z',
        current: '1.2.3',
      }),
    )
    const { calls, spawn } = packageSpawn('1.2.3')

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [],
        shell: '',
        yes: true,
        spawn,
        migrate: async (databasePath) => writeFile(databasePath, 'database'),
      }),
    ).rejects.toThrow(`remove ${runtime} and rerun install to repair it`)
    expect(calls.filter((call) => call[0] === 'npm' && call[1] === 'install')).toHaveLength(0)
  })

  it('publishes the verified node_modules tree by rename into a claimed destination', async () => {
    const home = await temporaryHome()
    let stagedNodeModulesInode: bigint | undefined
    const { spawn } = packageSpawn('1.2.3', {
      mutate: async (packageRoot) => {
        stagedNodeModulesInode = (await lstat(dirname(packageRoot), { bigint: true })).ino
      },
    })

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    const runtimeNodeModulesInode = (
      await lstat(join(home, '.coordrooms', 'runtime', '1.2.3', 'node_modules'), {
        bigint: true,
      })
    ).ino
    expect(runtimeNodeModulesInode).toBe(stagedNodeModulesInode)
  })

  it('cleans legacy previous links and backup directories on successful install', async () => {
    const home = await temporaryHome()
    const installRoot = join(home, '.coordrooms')
    const backups = join(installRoot, 'backups')
    await mkdir(join(installRoot, 'runtime', '1.2.2'), { recursive: true })
    await mkdir(backups)
    await writeFile(join(backups, 'legacy.bak'), 'backup')
    await symlink(join('runtime', '1.2.2'), join(installRoot, 'previous'))
    await writeFile(
      join(installRoot, 'install-state.json'),
      JSON.stringify({
        version: 1,
        package: { name: 'coordrooms', version: '1.2.3' },
        installedAt: '2026-08-16T00:00:00.000Z',
        current: '1.2.3',
        previous: '1.2.2',
        roots: [],
        hooks: [],
        skills: [],
        profiles: [],
        backups: [join(backups, 'legacy.bak')],
      }),
    )
    const { spawn } = packageSpawn('1.2.3')

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    await expect(lstat(join(installRoot, 'previous'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(backups)).rejects.toMatchObject({ code: 'ENOENT' })
    const manifest = JSON.parse(
      await readFile(join(installRoot, 'install-state.json'), 'utf8'),
    ) as {
      previous?: string
      backups?: string[]
    }
    expect(manifest.previous).toBeUndefined()
    expect(manifest.backups).toBeUndefined()
  })

  it('retains the formerly current runtime for one successful install', async () => {
    const home = await temporaryHome()
    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    await runInstall({
      version: '1.2.4',
      homeDirectory: home,
      roots: [],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.4').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    await expect(lstat(join(home, '.coordrooms', 'runtime', '1.2.3'))).resolves.toBeDefined()
    await expect(lstat(join(home, '.coordrooms', 'runtime', '1.2.4'))).resolves.toBeDefined()

    await runInstall({
      version: '1.2.5',
      homeDirectory: home,
      roots: [],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.5').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    await expect(lstat(join(home, '.coordrooms', 'runtime', '1.2.3'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(lstat(join(home, '.coordrooms', 'runtime', '1.2.4'))).resolves.toBeDefined()
    await expect(lstat(join(home, '.coordrooms', 'runtime', '1.2.5'))).resolves.toBeDefined()
  })

  it('rejects a downgrade before staging or migration', async () => {
    const home = await temporaryHome()
    const installRoot = join(home, '.coordrooms')
    await mkdir(installRoot)
    await writeFile(
      join(installRoot, 'install-state.json'),
      JSON.stringify({
        version: 1,
        package: { name: 'coordrooms', version: '1.2.3' },
        installedAt: '2026-08-16T00:00:00.000Z',
        current: '1.2.3',
      }),
    )
    const calls: string[] = []

    await expect(
      runInstall({
        version: '1.2.2',
        homeDirectory: home,
        roots: [],
        yes: true,
        spawn: async (command) => {
          calls.push(command)
        },
        migrate: async () => {
          calls.push('migrate')
        },
      }),
    ).rejects.toThrow('Refusing to downgrade')
    expect(calls).toEqual([])
  })

  it.each([
    {
      name: 'a bin outside the package',
      message: 'Package bin must be inside',
      mutate: async (root: string) =>
        writeFile(
          join(root, 'package.json'),
          JSON.stringify({
            name: 'coordrooms',
            version: '1.2.3',
            bin: { coordrooms: '../outside.js' },
          }),
        ),
    },
    {
      name: 'empty migrations',
      message: 'migrations must contain a non-empty file',
      mutate: async (root: string) => rm(join(root, 'migrations', '0000.sql')),
    },
    {
      name: 'the old dashboard shape',
      message: 'dashboard server entry must be a non-empty',
      mutate: async (root: string) => {
        const dashboard = join(root, 'assets', 'dashboard')
        await rm(dashboard, { recursive: true })
        await mkdir(join(dashboard, 'assets'), { recursive: true })
        await writeFile(join(dashboard, 'index.html'), '<script src="assets/app.js"></script>')
        await writeFile(join(dashboard, 'assets', 'app.js'), 'export default {}')
      },
    },
    {
      name: 'missing dashboard public assets',
      message: 'dashboard public assets must contain a non-empty',
      mutate: async (root: string) =>
        rm(join(root, 'assets', 'dashboard', 'public', 'assets', 'app.js')),
    },
    {
      name: 'a symlinked dashboard public asset',
      message: 'symbolic link',
      mutate: async (root: string) => {
        const outside = join(dirname(root), 'outside-dashboard.js')
        const asset = join(root, 'assets', 'dashboard', 'public', 'assets', 'app.js')
        await writeFile(outside, 'outside')
        await rm(asset)
        await symlink(outside, asset)
      },
    },
  ])('rejects a staged package with $name before migration', async ({ mutate, message }) => {
    const home = await temporaryHome()
    const { spawn } = packageSpawn('1.2.3', { mutate })
    let migrated = false

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [],
        shell: '',
        yes: true,
        spawn,
        migrate: async () => {
          migrated = true
        },
      }),
    ).rejects.toThrow(message)
    expect(migrated).toBe(false)
  })

  it('requires the staged executable to report exactly the requested version', async () => {
    const home = await temporaryHome()
    const { spawn } = packageSpawn('1.2.3', { reportedVersion: ' 1.2.3 ' })

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [],
        shell: '',
        yes: true,
        spawn,
      }),
    ).rejects.toThrow('Staged package --version returned')
  })

  it('requires a non-empty SQL migration file', async () => {
    const home = await temporaryHome()
    const { spawn } = packageSpawn('1.2.3', {
      mutate: async (root) => {
        await rm(join(root, 'migrations', '0000.sql'))
        await writeFile(join(root, 'migrations', 'snapshot.json'), '{}')
      },
    })

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [],
        shell: '',
        yes: true,
        spawn,
      }),
    ).rejects.toThrow('migrations must contain a non-empty file')
  })

  it('aborts before migration when the staged native libsql smoke query fails', async () => {
    const home = await temporaryHome()
    const { spawn } = packageSpawn('1.2.3', { nativeSmokeFailure: true })
    let migrated = false

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [],
        shell: '',
        yes: true,
        spawn,
        migrate: async () => {
          migrated = true
        },
      }),
    ).rejects.toThrow('native smoke failed')
    expect(migrated).toBe(false)
    await expect(lstat(join(home, '.coordrooms', '.stage-1.2.3'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('preserves modified skills and removes the managed block from modified profiles on uninstall', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    const skill = join(home, '.agents', 'skills', 'coordrooms', 'SKILL.md')
    const profile = join(home, '.zshrc')
    await mkdir(codex)
    const { spawn } = packageSpawn('1.2.3')

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '/bin/zsh',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    await writeFile(skill, 'user modified skill')
    await writeFile(profile, `${await readFile(profile, 'utf8')}export EDITOR=vim\n`)

    const result = await runUninstall({
      homeDirectory: home,
      shell: '/bin/zsh',
      yes: true,
    })

    expect(result.warnings).toEqual([
      `Preserved modified skill: ${skill}`,
      `Removed managed PATH block from modified profile: ${profile}`,
    ])
    await expect(readFile(skill, 'utf8')).resolves.toBe('user modified skill')
    await expect(readFile(profile, 'utf8')).resolves.toContain('export EDITOR=vim\n')
    await expect(readFile(profile, 'utf8')).resolves.not.toContain('>>> coordrooms >>>')
  })

  it('refuses to overwrite a modified canonical Codex skill before integration mutation', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    const skill = join(home, '.agents', 'skills', 'coordrooms', 'SKILL.md')
    await mkdir(codex)
    await mkdir(dirname(skill), { recursive: true })
    await writeFile(skill, 'user skill')
    const { calls, spawn } = packageSpawn('1.2.3')
    let migrated = false

    await expect(
      runInstall({
        version: '1.2.3',
        homeDirectory: home,
        roots: [{ client: 'codex', path: codex }],
        shell: '',
        yes: true,
        spawn,
        migrate: async () => {
          migrated = true
        },
      }),
    ).rejects.toThrow(`Refusing to overwrite modified skill: ${skill}.`)

    expect(migrated).toBe(false)
    await expect(readFile(skill, 'utf8')).resolves.toBe('user skill')
    await expect(lstat(join(codex, 'hooks.json'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(home, '.coordrooms', 'current'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect(calls.filter((call) => call[0] === 'npm' && call[1] === 'install')).toHaveLength(1)
  })

  it('rejects noncanonical Codex skill ownership in the manifest before uninstall mutation', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    const installRoot = join(home, '.coordrooms')
    const skill = join(home, '.agents', 'skills', 'coordrooms', 'SKILL.md')
    await mkdir(codex)

    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '',
      yes: true,
      spawn: packageSpawn('1.2.3').spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    const manifestPath = join(installRoot, 'install-state.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      skills: Array<{ path: string; hash: string }>
    }
    manifest.skills[0]!.path = join(home, '.agents', 'skills', 'other', 'SKILL.md')
    await writeFile(manifestPath, JSON.stringify(manifest))

    await expect(runUninstall({ homeDirectory: home, yes: true })).rejects.toThrow(
      'invalid skill ownership',
    )
    await expect(readFile(skill, 'utf8')).resolves.toBe('skill')
    await expect(readFile(join(codex, 'hooks.json'), 'utf8')).resolves.toContain(
      'consume-new-messages',
    )
    await expect(lstat(join(installRoot, 'current'))).resolves.toBeDefined()
  })

  it('shows the complete plan in one interactive confirmation', async () => {
    const home = await temporaryHome()
    let message = ''
    const { spawn } = packageSpawn('1.2.3')
    const result = await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [],
      shell: '',
      isTTY: true,
      prompt: async (value) => {
        message = value
        return true
      },
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })

    expect(message).toContain('The following changes will be made:')
    for (const change of result.changes)
      expect(message).toContain(`${change.action}: ${change.path}`)
    expect(message).toMatch(/Continue\?$/)
  })

  it('pauses stdin after an interactive cancellation', async () => {
    const home = await temporaryHome()
    const stdin = new PassThrough()
    Object.defineProperty(stdin, 'isTTY', { value: true })
    const stdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin')
    Object.defineProperty(process, 'stdin', { configurable: true, value: stdin })
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation((message) => {
      if (String(message).includes('Continue? [y/N] ')) stdin.write('n\n')
      return true
    })

    try {
      await expect(
        runInstall({
          version: '1.2.3',
          homeDirectory: home,
          roots: [],
          shell: '',
          spawn: packageSpawn('1.2.3').spawn,
          migrate: async (databasePath) => writeFile(databasePath, 'database'),
        }),
      ).rejects.toThrow('Installation cancelled.')
      expect(stdin.isPaused()).toBe(true)
    } finally {
      stdout.mockRestore()
      if (stdinDescriptor) Object.defineProperty(process, 'stdin', stdinDescriptor)
    }
  })

  it('pauses stdin after an interactive confirmation', async () => {
    const home = await temporaryHome()
    const stdin = new PassThrough()
    stdin.pause()
    Object.defineProperty(stdin, 'isTTY', { value: true })
    const stdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin')
    Object.defineProperty(process, 'stdin', { configurable: true, value: stdin })
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation((message) => {
      if (String(message).includes('Continue? [y/N] ')) stdin.write('y\n')
      return true
    })

    try {
      await expect(
        runInstall({
          version: '1.2.3',
          homeDirectory: home,
          roots: [],
          shell: '',
          spawn: packageSpawn('1.2.3').spawn,
          migrate: async (databasePath) => writeFile(databasePath, 'database'),
        }),
      ).resolves.toMatchObject({ version: '1.2.3' })
      expect(stdin.isPaused()).toBe(true)
    } finally {
      stdout.mockRestore()
      if (stdinDescriptor) Object.defineProperty(process, 'stdin', stdinDescriptor)
    }
  })

  it('uninstalls from the manifest without detecting newly malformed client roots', async () => {
    const home = await temporaryHome()
    const codex = join(home, '.codex')
    await mkdir(codex)
    const { spawn } = packageSpawn('1.2.3')
    await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [{ client: 'codex', path: codex }],
      shell: '',
      yes: true,
      spawn,
      migrate: async (databasePath) => writeFile(databasePath, 'database'),
    })
    const malformed = join(home, 'new-codex-root')
    await symlink(codex, malformed)
    const original = process.env.CODEX_HOME
    process.env.CODEX_HOME = malformed
    try {
      await runUninstall({ homeDirectory: home, yes: true })
    } finally {
      if (original === undefined) delete process.env.CODEX_HOME
      else process.env.CODEX_HOME = original
    }

    await expect(lstat(join(home, '.coordrooms', 'install-state.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('uninstalls a legacy manifest with previous and backups', async () => {
    const home = await temporaryHome()
    const installRoot = join(home, '.coordrooms')
    const backups = join(installRoot, 'backups')
    await mkdir(join(installRoot, 'runtime', '1.2.2'), { recursive: true })
    await mkdir(join(installRoot, 'runtime', '1.2.3'), { recursive: true })
    await mkdir(backups)
    await writeFile(join(backups, 'legacy.bak'), 'backup')
    await symlink(join('runtime', '1.2.3'), join(installRoot, 'current'))
    await symlink(join('runtime', '1.2.2'), join(installRoot, 'previous'))
    await writeFile(
      join(installRoot, 'install-state.json'),
      JSON.stringify({
        version: 1,
        package: { name: 'coordrooms', version: '1.2.3' },
        installedAt: '2026-08-16T00:00:00.000Z',
        current: '1.2.3',
        previous: '1.2.2',
        roots: [],
        hooks: [],
        skills: [],
        profiles: [],
        backups: [join(backups, 'legacy.bak')],
      }),
    )

    await runUninstall({ homeDirectory: home, yes: true })

    await expect(lstat(join(installRoot, 'install-state.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(lstat(join(installRoot, 'runtime'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(join(installRoot, 'previous'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(lstat(backups)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([
    ['darwin', '.bash_profile'],
    ['linux', '.bashrc'],
  ] as const)('selects the %s bash profile', async (platform, filename) => {
    const home = await temporaryHome()
    const result = await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [],
      shell: '/bin/bash',
      platform,
      dryRun: true,
      yes: true,
      spawn: async () => ({ stdout: '10.8.2\n', stderr: '' }),
    })

    expect(result.changes).toContainEqual({
      path: join(home, filename),
      action: 'add PATH block',
    })
  })

  it('warns when PATH must be configured manually', async () => {
    const home = await temporaryHome()
    const result = await runInstall({
      version: '1.2.3',
      homeDirectory: home,
      roots: [],
      shell: '/bin/nu',
      dryRun: true,
      yes: true,
      spawn: async () => ({ stdout: '10.8.2\n', stderr: '' }),
    })

    expect(result.warnings).toEqual([
      `No supported shell was detected (nu); add ${join(home, '.coordrooms', 'bin')} to PATH manually.`,
    ])
  })
})

async function temporaryHome(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'coordrooms-transaction-'))
  directories.push(home)
  return home
}

function packageSpawn(
  version: string,
  options: {
    nativeSmokeFailure?: boolean
    reportedVersion?: string
    mutate?: (packageRoot: string) => Promise<unknown>
  } = {},
): {
  calls: string[][]
  spawn: (
    command: string,
    args: string[],
    spawnOptions?: { cwd?: string },
  ) => Promise<{ stdout: string; stderr: string }>
} {
  const calls: string[][] = []
  return {
    calls,
    spawn: async (command, args, spawnOptions) => {
      calls.push([command, ...args])
      if (command === 'npm' && args[0] === 'install') {
        const packageRoot = await stagedPackage(args[args.indexOf('--prefix') + 1]!, version)
        await options.mutate?.(packageRoot)
      }
      if (command === 'npm') return { stdout: '10.8.2\n', stderr: '' }
      if (args.includes('--eval')) {
        const packageRoot = spawnOptions?.cwd
        if (!packageRoot) throw new Error('Expected staged package cwd.')
        const databaseUrl = args.at(-1)
        if (!databaseUrl) throw new Error('Expected staged verification database URL.')
        await writeFile(fileURLToPath(databaseUrl), 'database')
        if (options.nativeSmokeFailure) throw new Error('native smoke failed')
        const client = join(
          dirname(dirname(packageRoot)),
          'node_modules',
          '@libsql',
          'client',
          'index.js',
        )
        return { stdout: pathToFileURL(client).href, stderr: '' }
      }
      if (args.at(-1) === '--version') {
        return { stdout: `${options.reportedVersion ?? version}\n`, stderr: '' }
      }
      return { stdout: '', stderr: '' }
    },
  }
}

async function stagedPackage(stage: string, version: string = '1.2.3'): Promise<string> {
  const root = join(stage, 'node_modules', 'coordrooms')
  const client = join(stage, 'node_modules', '@libsql', 'client')
  await writeFile(join(stage, 'package.json'), JSON.stringify({ private: true }))
  await mkdir(client, { recursive: true })
  await mkdir(join(root, 'migrations'), { recursive: true })
  await mkdir(join(root, 'assets', 'coordrooms'), { recursive: true })
  await mkdir(join(root, 'assets', 'dashboard', 'server'), { recursive: true })
  await mkdir(join(root, 'assets', 'dashboard', 'migrations'), { recursive: true })
  await mkdir(join(root, 'assets', 'dashboard', 'public', 'assets'), { recursive: true })
  await mkdir(join(root, 'dist'), { recursive: true })
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'coordrooms',
      version,
      bin: { coordrooms: 'dist/index.js' },
    }),
  )
  await writeFile(
    join(client, 'package.json'),
    JSON.stringify({ name: '@libsql/client', type: 'module', exports: './index.js' }),
  )
  await writeFile(join(client, 'index.js'), 'export default {}')
  await writeFile(join(root, 'migrations', '0000.sql'), 'select 1;')
  await writeFile(join(root, 'assets', 'coordrooms', 'SKILL.md'), 'skill')
  await writeFile(join(root, 'assets', 'coordrooms', 'opencode-plugin.ts'), 'plugin')
  await writeFile(join(root, 'assets', 'dashboard', 'server', 'index.mjs'), 'export default {}')
  await writeFile(join(root, 'assets', 'dashboard', 'migrations', '0000.sql'), 'select 1;')
  await writeFile(
    join(root, 'assets', 'dashboard', 'public', 'assets', 'app.js'),
    'export default {}',
  )
  await writeFile(join(root, 'dist', 'index.js'), `console.log('${version}')`)
  return root
}
